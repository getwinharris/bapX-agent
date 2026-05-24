"""
bapX Backend — Minimal FastAPI
Only: user auth (signup/login/password-reset), email (SMTP), sandbox lifecycle, billing.
Everything else (chat, skills, memory, models, agent) handled by Codex inside sandbox.
"""
import os, uuid, json, sqlite3, hashlib, time, httpx, asyncio, smtplib, random, string
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from email.mime.text import MIMEText
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import jwt
import stripe
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from opensandbox import Sandbox
from opensandbox.config.connection import ConnectionConfig
from datetime import timedelta

# ── Config ──
JWT_SECRET = os.environ.get("BAPX_JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("FATAL: Set BAPX_JWT_SECRET (32+ chars)")
JWT_ALGO, JWT_EXPIRY_HOURS = "HS256", 72
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("BAPX_DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SANDBOX_BASE_URL = "http://127.0.0.1:8080"

# ── OpenSandbox helpers (inline — no wrapper file) ──
_sandbox_conn = None
def _sb_conn():
    global _sandbox_conn
    if _sandbox_conn is None:
        _sandbox_conn = ConnectionConfig(base_url=SANDBOX_BASE_URL, api_key="")
    return _sandbox_conn

_sandbox_cache: dict[str, str] = {}  # user_id → sandbox_id

async def _sb_start(user_id: str, username: str) -> str:
    """Create sandbox via OpenSandbox SDK. Returns sandbox_id."""
    if user_id in _sandbox_cache:
        try:
            sb = Sandbox.connect(_sandbox_cache[user_id], _sb_conn())
            info = await sb.get_info()
            if info.status.state == "RUNNING":
                return _sandbox_cache[user_id]
        except:
            pass
    try:
        sb = await Sandbox.create("ubuntu", connection_config=_sb_conn(),
            resource={"cpu": "500m", "memory": "1Gi"},
            metadata={"user_id": user_id, "name": username},
            timeout=timedelta(hours=1), skip_health_check=True)
        sid = str(sb.id) if hasattr(sb, 'id') else ""
        if sid:
            _sandbox_cache[user_id] = sid
        return sid
    except Exception as e:
        print(f"[Sandbox] Create failed: {e}")
        return ""

async def _sb_exec(user_id: str, cmd: str) -> dict:
    """Run command in user's sandbox."""
    sid = _sandbox_cache.get(user_id)
    if not sid:
        return {"output": "", "error": "No sandbox"}
    try:
        sb = Sandbox.connect(sid, _sb_conn())
        res = await sb.commands.run(cmd)
        text = ""
        try:
            text = res.logs.stdout[0].text
        except:
            text = str(res)
        return {"output": text, "exit_code": 0}
    except Exception as e:
        return {"output": "", "error": str(e)}

async def _sb_stop(user_id: str) -> dict:
    """Stop user's sandbox."""
    sid = _sandbox_cache.pop(user_id, None)
    if sid:
        try:
            sb = Sandbox.connect(sid, _sb_conn())
            await sb.kill()
        except:
            pass
    return {"deleted": True}

async def _sb_status(user_id: str) -> dict:
    """Get sandbox status."""
    sid = _sandbox_cache.get(user_id)
    if not sid:
        return {"status": "none"}
    try:
        sb = Sandbox.connect(sid, _sb_conn())
        info = await sb.get_info()
        return {"status": "running", "sandbox_id": sid, "info": str(info)[:200]}
    except:
        return {"status": "stopped", "sandbox_id": sid}

# ── Email Config ──
SMTP_HOST = os.environ.get("BAPX_SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("BAPX_SMTP_PORT", "587"))
SMTP_USER = os.environ.get("BAPX_SMTP_USER", "")
SMTP_PASS = os.environ.get("BAPX_SMTP_PASS", "")
SMTP_FROM = os.environ.get("BAPX_SMTP_FROM", "noreply@bapx.in")

# ── DB ──
conn = sqlite3.connect(str(DATA_DIR / "bapx.db"), check_same_thread=False, timeout=10)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=5000")
conn.execute("PRAGMA foreign_keys=ON")

conn.execute("""CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, email_verified INTEGER DEFAULT 0,
    age TEXT DEFAULT '', bio TEXT DEFAULT '', is_admin INTEGER DEFAULT 0, banned INTEGER DEFAULT 0,
    sandbox_id TEXT DEFAULT '', stripe_sub_id TEXT DEFAULT '', stripe_status TEXT DEFAULT 'none',
    storage_used INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY, user_id TEXT, email TEXT NOT NULL, code TEXT NOT NULL,
    purpose TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, sandbox_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS admin_config (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now'))
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS admin_mail (
    id INTEGER PRIMARY KEY AUTOINCREMENT, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL,
    subject TEXT, body TEXT, read INTEGER DEFAULT 0, received_at TEXT DEFAULT (datetime('now'))
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL,
    message TEXT NOT NULL, severity TEXT DEFAULT 'info', read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
)""")
# Migration: add extra columns
for col_sql in [
    "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN sandbox_id TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN stripe_sub_id TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN stripe_status TEXT DEFAULT 'none'",
    "ALTER TABLE users ADD COLUMN storage_used INTEGER DEFAULT 0",
]:
    try: conn.execute(col_sql)
    except: pass
conn.commit()

# Seed admin user
if not conn.execute("SELECT id FROM users WHERE is_admin = 1").fetchone():
    pw = os.environ.get("BAPX_ADMIN_PASSWORD", "admin123")
    uid = uuid.uuid4().hex
    conn.execute("INSERT INTO users (id, username, name, email, password_hash, is_admin, email_verified) VALUES (?, ?, ?, ?, ?, 1, 1)",
        (uid, "admin", "Admin", "admin@bapx.in", hashlib.sha256(pw.encode()).hexdigest()))
    conn.commit()
    print(f"[Admin] admin@bapx.in / pw: {'[ENV]' if 'BAPX_ADMIN_PASSWORD' in os.environ else 'admin123'}")

DEFAULT_CONFIG = {
    "stripe_secret_key": "", "stripe_webhook_secret": "",
    "smtp_host": SMTP_HOST, "smtp_port": str(SMTP_PORT),
    "smtp_user": SMTP_USER, "smtp_pass": SMTP_PASS,
    "admin_email": "", "billing_plan_base_price": "5",
    "billing_storage_price_per_gb": "1",
}
for k, v in DEFAULT_CONFIG.items():
    if not conn.execute("SELECT key FROM admin_config WHERE key = ?", (k,)).fetchone():
        conn.execute("INSERT INTO admin_config (key, value) VALUES (?, ?)", (k, v))
conn.commit()

# ── FastAPI App ──
app = FastAPI(title="bapX API", version="0.3.0")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
CORS_ORIGINS = os.environ.get("BAPX_CORS_ORIGINS",
    "https://bapx.in,https://agent.bapx.in,http://localhost:7654").split(",")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# ── Models ──
class SignupReq(BaseModel):
    username: str; name: str; email: str; password: str; age: str = ""; bio: str = ""
class LoginReq(BaseModel):
    email: str; password: str
class ProfileUpdate(BaseModel):
    name: Optional[str] = None; age: Optional[str] = None; bio: Optional[str] = None
class ForgotPasswordReq(BaseModel):
    email: str
class ResetPasswordReq(BaseModel):
    email: str; code: str; password: str
class VerifyEmailReq(BaseModel):
    email: str; code: str
class SandboxExecReq(BaseModel):
    command: str; language: str = "bash"

# ── Auth Helpers ──
def make_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = conn.execute("SELECT * FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    if not user:
        raise HTTPException(401, "User not found")
    if user["banned"]:
        raise HTTPException(403, "Account banned")
    return dict(user)

def get_admin_user(request: Request) -> dict:
    user = get_current_user(request)
    if not user.get("is_admin"):
        raise HTTPException(403, "Admin required")
    return user

def gen_code(n=8) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def send_email(to: str, subject: str, body: str):
    """Send email via SMTP (GitHub-style format)."""
    if not SMTP_HOST:
        return
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            if SMTP_USER:
                s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
    except Exception as e:
        print(f"[Email] Send failed: {e}")

# ── Routes ──

# ── Auth ──
@app.post("/api/signup")
@limiter.limit("5/minute")
async def signup(req: SignupReq, request: Request):
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be 8+ characters")
    if not all(c.isalnum() or c in '_-' for c in req.username) or len(req.username) < 3:
        raise HTTPException(400, "Username: 3+ alphanumeric/-_")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(400, "Invalid email")
    if conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone():
        raise HTTPException(409, "Username taken")
    if conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone():
        raise HTTPException(409, "Email registered")

    uid = uuid.uuid4().hex
    conn.execute("INSERT INTO users (id, username, name, email, password_hash, age, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (uid, req.username, req.name, req.email,
         hashlib.sha256(req.password.encode()).hexdigest(), req.age, req.bio))
    conn.commit()

    # Send verification email (GitHub-style)
    code = gen_code()
    cid = uuid.uuid4().hex
    conn.execute("INSERT INTO verification_codes (id, user_id, email, code, purpose, expires_at) VALUES (?, ?, ?, ?, 'email_verify', ?)",
        (cid, uid, req.email, code, (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()))
    conn.commit()
    send_email(req.email,
        "[bapX] Verify your email address",
        f"Hi {req.name},\n\nYour bapX verification code:\n\n  {code}\n\nEnter this code to verify your email. This code expires in 24 hours.\n\nThanks,\nbapX Team")

    return {"token": make_token(uid), "user": {"id": uid, "username": req.username, "name": req.name, "email": req.email}}

@app.post("/api/login")
@limiter.limit("10/minute")
def login(req: LoginReq, request: Request):
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user or not hashlib.sha256(req.password.encode()).hexdigest() == user["password_hash"]:
        raise HTTPException(401, "Invalid email or password")
    return {"token": make_token(user["id"]), "user": dict(user)}

@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(req: ForgotPasswordReq, request: Request):
    user = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user:
        return {"status": "ok"}  # Don't reveal if email exists
    code = gen_code()
    cid = uuid.uuid4().hex
    conn.execute("INSERT INTO verification_codes (id, user_id, email, code, purpose, expires_at) VALUES (?, ?, ?, ?, 'password_reset', ?)",
        (cid, user["id"], req.email, code, (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()))
    conn.commit()
    send_email(req.email,
        "[bapX] Reset your password",
        f"Hi {user['name']},\n\nYour bapX password reset code:\n\n  {code}\n\nEnter this code to reset your password. This code expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nThanks,\nbapX Team")
    return {"status": "ok"}

@app.post("/api/auth/reset-password")
@limiter.limit("5/minute")
def reset_password(req: ResetPasswordReq, request: Request):
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be 8+ characters")
    row = conn.execute("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = 'password_reset' AND used = 0 AND expires_at > datetime('now')",
        (req.email, req.code)).fetchone()
    if not row:
        raise HTTPException(400, "Invalid or expired code")
    conn.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (row["id"],))
    conn.execute("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?",
        (hashlib.sha256(req.password.encode()).hexdigest(), req.email))
    conn.commit()
    return {"status": "ok", "message": "Password reset successfully"}

@app.post("/api/auth/verify-email")
@limiter.limit("5/minute")
def verify_email(req: VerifyEmailReq, request: Request):
    row = conn.execute("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = 'email_verify' AND used = 0 AND expires_at > datetime('now')",
        (req.email, req.code)).fetchone()
    if not row:
        raise HTTPException(400, "Invalid or expired code")
    conn.execute("UPDATE verification_codes SET used = 1 WHERE id = ?", (row["id"],))
    conn.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (row["user_id"],))
    conn.commit()
    return {"status": "ok", "message": "Email verified"}

# ── User Profile ──
@app.get("/api/user/profile")
async def user_profile(user: dict = Depends(get_current_user)):
    sandbox_status = await get_sandbox_status(user["id"]) if user.get("sandbox_id") else {"status": "none"}
    return {"id": user["id"], "username": user["username"], "name": user["name"],
        "email": user["email"], "age": user["age"], "bio": user["bio"],
        "email_verified": user["email_verified"], "is_admin": user["is_admin"],
        "sandbox_status": sandbox_status.get("status", "none"),
        "stripe_status": user.get("stripe_status", "none")}

@app.put("/api/user/profile")
def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates, vals = [], []
    for f in ("name", "age", "bio"):
        v = getattr(req, f, None)
        if v is not None:
            updates.append(f"{f} = ?"); vals.append(v)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    vals.append(user["id"])
    conn.execute(f"UPDATE users SET {', '.join(updates)}, updated_at = datetime('now') WHERE id = ?", vals)
    conn.commit()
    return {"status": "ok"}

# ── Sandbox File Bridge (write config/auth to sandbox ~/.bapx/) ──
@app.post("/api/sandbox/write-file")
async def sandbox_write_file(req: Request, user: dict = Depends(get_current_user)):
    """Write a file to user's sandbox at ~/.bapx/<path>"""
    body = await req.json()
    filepath = body.get("path", "")
    content = body.get("content", "")
    if not filepath or not content:
        raise HTTPException(400, "path and content required")
    safe_path = filepath.replace("..", "").lstrip("/")
    try:
        sb = await get_sandbox_status(user["id"])
        if not sb or not sb.get("sandbox_id"):
            sb = await start_sandbox(user["id"], user["username"])
            if sb and sb.get("sandbox_id"):
                conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (sb["sandbox_id"], user["id"]))
                conn.commit()
        result = await exec_in_sandbox(user["id"],
            f"mkdir -p ~/.bapx/$(dirname {safe_path}) && cat > ~/.bapx/{safe_path} << 'BAPXEOF'\n{content}\nBAPXEOF")
        return {"status": "ok", "path": f"~/.bapx/{safe_path}"}
    except Exception as e:
        raise HTTPException(500, f"Failed: {str(e)[:200]}")

@app.get("/api/sandbox/read-file")
async def sandbox_read_file(path: str = "", user: dict = Depends(get_current_user)):
    """Read a file from user's sandbox at ~/.bapx/<path>"""
    if not path:
        raise HTTPException(400, "path required")
    safe_path = path.replace("..", "").lstrip("/")
    try:
        result = await exec_in_sandbox(user["id"], f"cat ~/.bapx/{safe_path} 2>/dev/null || echo 'NOT_FOUND'")
        output = result.get("output", "").strip()
        if output == "NOT_FOUND":
            raise HTTPException(404, "File not found")
        return {"content": output, "path": f"~/.bapx/{safe_path}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e)[:200])

# ── Sandbox ──
@app.post("/api/sandbox/start")
async def sb_start(user: dict = Depends(get_current_user)):
    result = await start_sandbox(user["id"], user["username"])
    if result and result.get("sandbox_id"):
        conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (result["sandbox_id"], user["id"]))
        conn.commit()
    return result

@app.post("/api/sandbox/stop")
async def sb_stop(user: dict = Depends(get_current_user)):
    result = await stop_sandbox(user["id"])
    if result.get("deleted"):
        conn.execute("UPDATE users SET sandbox_id = '' WHERE id = ?", (user["id"],))
        conn.commit()
    return result

@app.get("/api/sandbox/status")
async def sb_status(user: dict = Depends(get_current_user)):
    return await get_sandbox_status(user["id"])

# ── Admin ──
@app.post("/api/admin/login")
def admin_login(req: LoginReq):
    user = conn.execute("SELECT * FROM users WHERE email = ? AND is_admin = 1", (req.email,)).fetchone()
    if not user or not hashlib.sha256(req.password.encode()).hexdigest() == user["password_hash"]:
        raise HTTPException(401, "Invalid admin credentials")
    return {"token": make_token(user["id"]), "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "admin"}}

@app.get("/api/admin/stats")
def admin_stats(admin: dict = Depends(get_admin_user)):
    return {"total_users": conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"],
        "active_users": conn.execute("SELECT COUNT(*) as c FROM users WHERE banned = 0").fetchone()["c"],
        "banned_users": conn.execute("SELECT COUNT(*) as c FROM users WHERE banned = 1").fetchone()["c"],
        "verified_users": conn.execute("SELECT COUNT(*) as c FROM users WHERE email_verified = 1").fetchone()["c"],
        "signups_today": conn.execute("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', 'start of day')").fetchone()["c"]}

@app.get("/api/admin/users")
def admin_users(search: str = "", page: int = 1, limit: int = 20, admin: dict = Depends(get_admin_user)):
    offset = (page - 1) * limit
    where = ""
    params = []
    if search:
        where = "WHERE username LIKE ? OR email LIKE ?"
        params = [f"%{search}%", f"%{search}%"]
    rows = conn.execute(f"SELECT id, username, name, email, email_verified, is_admin, banned, created_at FROM users {where} ORDER BY created_at DESC LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
    total = conn.execute(f"SELECT COUNT(*) as c FROM users {where}", params).fetchone()["c"]
    return {"users": [dict(r) for r in rows], "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@app.post("/api/admin/users/{user_id}/ban")
def admin_ban(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE users SET banned = 1 WHERE id = ?", (user_id,))
    conn.commit()
    return {"status": "banned"}

@app.post("/api/admin/users/{user_id}/unban")
def admin_unban(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE users SET banned = 0 WHERE id = ?", (user_id,))
    conn.commit()
    return {"status": "unbanned"}

@app.delete("/api/admin/users/{user_id}")
def admin_delete(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return {"status": "deleted"}

@app.get("/api/admin/config")
def admin_get_config(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT key, value FROM admin_config ORDER BY key").fetchall()
    return {"config": {r["key"]: r["value"] for r in rows}}

@app.post("/api/admin/config")
def admin_set_config(key: str = "", value: str = "", admin: dict = Depends(get_admin_user)):
    conn.execute("INSERT OR REPLACE INTO admin_config (key, value, updated_at) VALUES (?, ?, datetime('now'))", (key, value))
    conn.commit()
    return {"status": "ok"}

@app.get("/api/admin/notifications")
def admin_notifications(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT * FROM admin_notifications ORDER BY read ASC, created_at DESC LIMIT 50").fetchall()
    return {"notifications": [dict(r) for r in rows]}

@app.post("/api/admin/notifications/{nid}/read")
def admin_read_notif(nid: int, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE admin_notifications SET read = 1 WHERE id = ?", (nid,))
    conn.commit()
    return {"status": "ok"}

# ── Billing ──
@app.post('/api/billing/create-checkout')
async def create_checkout(user: dict = Depends(get_current_user)):
    sk = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_secret_key'").fetchone()
    if not sk or not sk['value']:
        raise HTTPException(400, 'Stripe not configured')
    stripe.api_key = sk['value']
    bp = int(conn.execute("SELECT value FROM admin_config WHERE key = 'billing_plan_base_price'").fetchone()['value'] or 5)
    sess = stripe.checkout.Session.create(mode='subscription',
        line_items=[{'price_data': {'currency': 'usd', 'product_data': {'name': 'bapX Starter - 5GB'}, 'unit_amount': bp * 100}, 'quantity': 1}],
        metadata={'user_id': user['id']}, success_url='https://bapx.in/dashboard?billing=success',
        cancel_url='https://bapx.in/dashboard?billing=canceled')
    return {'url': sess.url, 'session_id': sess.id}

@app.post('/api/billing/webhook')
async def billing_webhook(request: Request):
    sk = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_secret_key'").fetchone()
    ws = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_webhook_secret'").fetchone()
    payload = await request.body()
    sig = request.headers.get('stripe-signature', '')
    try:
        event = stripe.Webhook.construct_event(payload, sig, ws['value'] if ws and ws['value'] else '')
    except Exception:
        raise HTTPException(400, 'Invalid webhook signature')
    if event['type'] == 'checkout.session.completed':
        uid = event['data']['object'].get('metadata', {}).get('user_id', '')
        if uid:
            sub_id = event['data']['object'].get('subscription', '')
            conn.execute("UPDATE users SET stripe_sub_id = ?, stripe_status = 'active' WHERE id = ?", (sub_id, uid))
            conn.commit()
    return {'status': 'ok'}

@app.get('/api/billing/subscription')
def get_subscription(user: dict = Depends(get_current_user)):
    return {'status': user.get('stripe_status', 'none'),
        'plan': 'Starter' if user.get('stripe_status') == 'active' else 'None',
        'storage_limit_gb': 5 if user.get('stripe_status') == 'active' else 0,
        'storage_used_bytes': user.get('storage_used', 0),
        'subscription_id': user.get('stripe_sub_id', None)}

# ── Health ──
@app.get("/health")
def health():
    return {"status": "ok", "service": "bapx-api",
        "users": conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]}

# ── Static Files ──
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# ── Main ──
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "7654"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
