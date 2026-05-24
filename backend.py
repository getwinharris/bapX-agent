"""
bapX Backend — Minimal FastAPI
Only: user auth (signup/login/password-reset), email (SMTP), sandbox lifecycle, billing.
Everything else (chat, skills, memory, models, agent) handled by bapX inside sandbox.
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
from contextlib import asynccontextmanager
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

# ── Provider Configuration (mirrors Hermes Agent provider list) ──
ALL_PROVIDERS = {
    "openai":           {"name": "OpenAI", "models": ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo","o1","o1-mini","o3-mini"], "env": "OPENAI_API_KEY", "oauth": True},
    "anthropic":        {"name": "Anthropic", "models": ["claude-sonnet-4","claude-opus-4","claude-haiku-3.5","claude-sonnet-3.5"], "env": "ANTHROPIC_API_KEY", "oauth": True},
    "openrouter":       {"name": "OpenRouter", "models": ["*"], "env": "OPENROUTER_API_KEY"},
    "google":           {"name": "Google Gemini", "models": ["gemini-2.5-pro","gemini-2.5-flash","gemini-2.0-flash"], "env": "GOOGLE_API_KEY", "oauth": True},
    "deepseek":         {"name": "DeepSeek", "models": ["deepseek-chat","deepseek-reasoner"], "env": "DEEPSEEK_API_KEY"},
    "xai":              {"name": "xAI / Grok", "models": ["grok-3","grok-3-mini","grok-2","grok-2-mini"], "env": "XAI_API_KEY"},
    "huggingface":      {"name": "HuggingFace", "models": ["*"], "env": "HF_TOKEN"},
    "github":           {"name": "GitHub Models", "models": ["*"], "env": "GITHUB_TOKEN"},
    "mistral":          {"name": "Mistral", "models": ["mistral-large-latest","mistral-small-latest","codestral-latest"], "env": "MISTRAL_API_KEY"},
    "groq":             {"name": "Groq", "models": ["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768"], "env": "GROQ_API_KEY"},
    "perplexity":       {"name": "Perplexity", "models": ["sonar-pro","sonar","sonar-deep-research"], "env": "PERPLEXITY_API_KEY"},
    "together":         {"name": "Together AI", "models": ["*"], "env": "TOGETHER_API_KEY"},
    "fireworks":        {"name": "Fireworks AI", "models": ["*"], "env": "FIREWORKS_API_KEY"},
    "cohere":           {"name": "Cohere", "models": ["command-r-plus","command-r","command-a"], "env": "COHERE_API_KEY"},
    "replicate":        {"name": "Replicate", "models": ["*"], "env": "REPLICATE_API_KEY"},
    "kimi":             {"name": "Kimi / Moonshot", "models": ["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"], "env": "KIMI_API_KEY"},
    "qwen":             {"name": "Qwen (Alibaba)", "models": ["qwen-max","qwen-plus","qwen-turbo","qwq-32b"], "env": "DASHSCOPE_API_KEY", "oauth": True},
    "zhipu":            {"name": "ZHIPU AI", "models": ["glm-4","glm-4-air","glm-4-flash"], "env": "ZHIPU_API_KEY"},
    "minimax":          {"name": "MiniMax", "models": ["minimax-text-01","minimax-reasoning"], "env": "MINIMAX_API_KEY"},
    "minimax-cn":       {"name": "MiniMax CN", "models": ["minimax-text-01","minimax-reasoning"], "env": "MINIMAX_CN_API_KEY"},
    "deepinfra":        {"name": "DeepInfra", "models": ["*"], "env": "DEEPINFRA_API_KEY"},
    "nous":             {"name": "Nous Portal", "models": ["*"], "env": "NOUS_API_KEY", "oauth": True},
    "copilot":          {"name": "GitHub Copilot", "models": ["gpt-4o","claude-sonnet-4"], "oauth": True},
    "elevenlabs":       {"name": "ElevenLabs", "models": ["*"], "env": "ELEVENLABS_API_KEY"},
    "xiaomi":           {"name": "Xiaomi MiMo", "models": ["mimo-pro","mimo-lite"], "env": "XIAOMI_API_KEY"},
    "kilocode":         {"name": "Kilo Code", "models": ["*"], "env": "KILOCODE_API_KEY"},
    "ai-gateway":       {"name": "AI Gateway (Vercel)", "models": ["*"], "env": "AI_GATEWAY_API_KEY"},
    "opencode-zen":     {"name": "OpenCode Zen", "models": ["*"], "env": "OPENCODE_ZEN_API_KEY"},
    "opencode-go":      {"name": "OpenCode Go", "models": ["*"], "env": "OPENCODE_GO_API_KEY"},
    "custom":           {"name": "Custom Endpoint", "models": ["custom"], "custom_url": True},
}

OAUTH_CONFIGS = {
    "openai-oauth": {
        "provider_name": "ChatGPT (OpenAI) — Existing Plan",
        "client_id": "bapx-oauth-openai",
        "authorization_url": "https://auth.openai.com/authorize",
        "token_url": "https://auth.openai.com/oauth/token",
        "scopes": ["openid","email","profile","models.read","chat.write"],
        "description": "Use your existing ChatGPT Plus/Pro subscription",
        "connect_label": "Login with ChatGPT",
    },
    "anthropic-oauth": {
        "provider_name": "Claude (Anthropic) — Existing Plan",
        "client_id": "bapx-oauth-anthropic",
        "authorization_url": "https://auth.anthropic.com/authorize",
        "token_url": "https://auth.anthropic.com/oauth/token",
        "scopes": ["openid","email","profile","models.read","messages.write"],
        "description": "Use your existing Claude Pro/Max subscription",
        "connect_label": "Login with Claude",
    },
    "google-oauth": {
        "provider_name": "Google",
        "client_id": "bapx-oauth-google",
        "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes": ["openid","email","profile","https://www.googleapis.com/auth/generative-language"],
        "description": "Use your Google account for Gemini models",
        "connect_label": "Login with Google",
    },
    "nous-oauth": {
        "provider_name": "Nous Portal",
        "client_id": "bapx-oauth-nous",
        "authorization_url": "https://auth.nousresearch.com/authorize",
        "token_url": "https://auth.nousresearch.com/oauth/token",
        "scopes": ["openid","email","profile"],
        "description": "Login via Nous Research Portal",
        "connect_label": "Login with Nous",
    },
    "qwen-oauth": {
        "provider_name": "Qwen (Alibaba)",
        "client_id": "bapx-oauth-qwen",
        "authorization_url": "https://oauth.alibaba.com/authorize",
        "token_url": "https://oauth.alibaba.com/oauth/token",
        "scopes": ["openid","email","profile","models.read"],
        "description": "Use your Alibaba Cloud account for Qwen models",
        "connect_label": "Login with Alibaba",
    },
    "github-copilot": {
        "provider_name": "GitHub Copilot",
        "client_id": "bapx-oauth-github",
        "authorization_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "scopes": ["read:user","user:email","copilot"],
        "description": "Use your GitHub Copilot subscription",
        "connect_label": "Login with GitHub Copilot",
    },
    "openai-codex-oauth": {
        "provider_name": "OpenAI Codex",
        "client_id": "bapx-oauth-codex",
        "authorization_url": "https://auth.openai.com/authorize",
        "token_url": "https://auth.openai.com/oauth/token",
        "scopes": ["openid","email","profile","models.read","codex.write"],
        "description": "Login with OpenAI Codex subscription",
        "connect_label": "Login with Codex",
    },
}
OAUTH_FLOWS: dict[str, dict] = {}  # flow_id -> {provider, user_code, device_code, verification_uri, status, oauth_data, user_id}

# ── OpenSandbox helpers (inline — no wrapper file) ──
_sandbox_conn = None
def _sb_conn():
    global _sandbox_conn
    if _sandbox_conn is None:
        _sandbox_conn = ConnectionConfig(base_url=SANDBOX_BASE_URL, api_key="")
    return _sandbox_conn

_sb_cache: dict[str, str] = {}  # user_id → sandbox_id

# Load existing sandbox IDs from DB into cache on import
try:
    for row in conn.execute("SELECT id, sandbox_id FROM users WHERE sandbox_id != ''").fetchall():
        if row["sandbox_id"]:
            _sb_cache[row["id"]] = row["sandbox_id"]
except:
    pass

async def start_sandbox(user_id: str, username: str) -> dict:
    """Create sandbox via OpenSandbox SDK. Returns {sandbox_id, status}."""
    if user_id in _sb_cache:
        try:
            sb = await Sandbox.connect(_sb_cache[user_id], _sb_conn())
            info = await sb.get_info()
            if info.status.state == "RUNNING":
                return {"sandbox_id": _sb_cache[user_id], "status": "running"}
        except:
            pass
    try:
        sb = await Sandbox.create("ubuntu", connection_config=_sb_conn(),
            resource={"cpu": "500m", "memory": "1Gi"},
            metadata={"user_id": user_id, "name": username},
            timeout=timedelta(hours=1), skip_health_check=True)
        sid = str(sb.id) if hasattr(sb, 'id') else ""
        if sid:
            _sb_cache[user_id] = sid
            # Auto-provision tools in background (non-blocking)
            asyncio.create_task(_provision_tools_in_sandbox(user_id))
        return {"sandbox_id": sid, "status": "running"} if sid else {"status": "error", "sandbox_id": ""}
    except Exception as e:
        print(f"[Sandbox] Create failed: {e}")
        return {"status": "error", "sandbox_id": ""}

# ── Tool Provisioning (reusable) ──
TOOLS_MANIFEST_PATH = Path(__file__).parent / "tools" / "manifest.json"
TOOLS_DIR = Path(__file__).parent / "tools"

async def _provision_tools_in_sandbox(user_id: str) -> dict:
    """Provision all bapX built-in tools into the user's sandbox. Shared by start_sandbox + endpoint."""
    manifest = {}
    if TOOLS_MANIFEST_PATH.exists():
        import json as _json
        manifest = _json.loads(TOOLS_MANIFEST_PATH.read_text())

    # Copy tool scripts into sandbox
    installed = []
    for f in sorted(TOOLS_DIR.glob("tool_*.py")):
        content = f.read_text()
        safe_content = content.replace("'", "'\\''")
        name = f.name
        await exec_in_sandbox(user_id,
            f"mkdir -p ~/.bapx/tools && cat > ~/.bapx/tools/{name} << 'BAPXEOF'\n{content}\nBAPXEOF")
        installed.append(name)

    # Install Python deps
    all_deps = set()
    for tname, tcfg in manifest.get("tools", {}).items():
        for dep in tcfg.get("deps", []):
            all_deps.add(dep)
    if all_deps:
        deps_str = " ".join(all_deps)
        await exec_in_sandbox(user_id, f"pip3 install {deps_str} 2>/dev/null || true")

    # Install system deps
    await exec_in_sandbox(user_id,
        "apt-get update -qq && apt-get install -y -qq tesseract-ocr poppler-utils 2>/dev/null || true")

    return {"status": "ok", "installed": installed, "count": len(installed)}

async def exec_in_sandbox(user_id: str, cmd: str) -> dict:
    """Run command in user's sandbox."""
    sid = _sb_cache.get(user_id)
    if not sid:
        return {"output": "", "error": "No sandbox"}
    try:
        sb = await Sandbox.connect(sid, _sb_conn())
        res = await sb.commands.run(cmd)
        text = ""
        try:
            # Concatenate all stdout lines
            lines = []
            for entry in res.logs.stdout:
                if hasattr(entry, 'text'):
                    lines.append(entry.text)
                else:
                    lines.append(str(entry))
            text = "\n".join(lines)
        except:
            text = str(res)
        return {"output": text, "exit_code": 0}
    except Exception as e:
        return {"output": "", "error": str(e)}

async def stop_sandbox(user_id: str) -> dict:
    """Stop user's sandbox. If prune=True, destroy it entirely."""
    sid = _sb_cache.pop(user_id, None)
    if sid:
        try:
            sb = await Sandbox.connect(sid, _sb_conn())
            await sb.kill()
        except:
            pass
    return {"deleted": True}

async def get_sandbox_status(user_id: str) -> dict:
    """Get sandbox status."""
    sid = _sb_cache.get(user_id)
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
    storage_used INTEGER DEFAULT 0, plan TEXT DEFAULT '', extra_storage_gb INTEGER DEFAULT 0,
    test_expires_at TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
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
# New feature tables
conn.execute("CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, domain TEXT NOT NULL UNIQUE, project TEXT DEFAULT '', status TEXT DEFAULT 'pending', ssl_status TEXT DEFAULT 'pending', dns_record TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS deployments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project TEXT NOT NULL, status TEXT DEFAULT 'pending', url TEXT DEFAULT '', build_log TEXT DEFAULT '', deploy_time TEXT DEFAULT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS git_connections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, repo_url TEXT NOT NULL, repo_name TEXT NOT NULL, branch TEXT DEFAULT 'main', auth_token TEXT DEFAULT '', status TEXT DEFAULT 'connected', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS mail_inbox (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL, subject TEXT, body TEXT, task_created INTEGER DEFAULT 0, read INTEGER DEFAULT 0, received_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")

# Migration: add extra columns
for col_sql in [
    "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN sandbox_id TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN stripe_sub_id TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN stripe_status TEXT DEFAULT 'none'",
    "ALTER TABLE users ADD COLUMN storage_used INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN payment_grace_start TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN extra_storage_gb INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN test_expires_at TEXT DEFAULT ''",
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
    "stripe_price_starter": "price_bapx_starter_5gb",
    "stripe_price_pro": "price_bapx_pro_20gb",
    "stripe_price_storage_addon": "price_bapx_addon_1gb",
    "smtp_host": SMTP_HOST, "smtp_port": str(SMTP_PORT),
    "smtp_user": SMTP_USER, "smtp_pass": SMTP_PASS,
    "admin_email": "",
}
for k, v in DEFAULT_CONFIG.items():
    if not conn.execute("SELECT key FROM admin_config WHERE key = ?", (k,)).fetchone():
        conn.execute("INSERT INTO admin_config (key, value) VALUES (?, ?)", (k, v))
conn.commit()

# ── Background billing checker (runs every 10 min) ──
GRACE_FREEZE_DAYS = 2     # stop sandbox after this many days of non-payment
GRACE_PRUNE_DAYS = 14     # destroy sandbox + ban user after this many days

async def billing_checker():
    """Periodic task: enforce billing grace periods."""
    while True:
        try:
            await asyncio.sleep(600)  # 10 minutes
            now = datetime.now(timezone.utc)
            # Check past_due users
            rows = conn.execute(
                "SELECT id, username, sandbox_id, payment_grace_start, stripe_status FROM users "
                "WHERE stripe_status IN ('past_due','frozen') AND payment_grace_start != ''"
            ).fetchall()
            for row in rows:
                try:
                    grace_start = datetime.fromisoformat(row["payment_grace_start"])
                    days_since = (now - grace_start).total_seconds() / 86400.0

                    # 14+ days → prune sandbox entirely, ban user
                    if days_since >= GRACE_PRUNE_DAYS:
                        print(f"[Billing] Pruning sandbox for {row['username']} ({days_since:.1f}d past due)")
                        sid = _sb_cache.pop(row["id"], None)
                        if sid:
                            try:
                                sb = await Sandbox.connect(sid, _sb_conn())
                                await sb.kill()
                            except:
                                pass
                        if row.get("sandbox_id"):
                            try:
                                sb = Sandbox.connect(row["sandbox_id"], _sb_conn())
                                await sb.kill()
                            except:
                                pass
                        conn.execute(
                            "UPDATE users SET banned = 1, sandbox_id = '', stripe_status = 'pruned' WHERE id = ?",
                            (row["id"],)
                        )
                        conn.commit()
                        print(f"[Billing] User {row['username']} pruned (14+ days)")
                        continue

                    # 2+ days → freeze sandbox (stop automations)
                    if days_since >= GRACE_FREEZE_DAYS and row["stripe_status"] != "frozen":
                        print(f"[Billing] Freezing sandbox for {row['username']} ({days_since:.1f}d past due)")
                        sid = _sb_cache.get(row["id"])
                        if sid:
                            try:
                                sb = await Sandbox.connect(sid, _sb_conn())
                                await sb.kill()
                            except:
                                pass
                        conn.execute(
                            "UPDATE users SET stripe_status = 'frozen' WHERE id = ?",
                            (row["id"],)
                        )
                        conn.commit()

                except Exception as e:
                    print(f"[Billing] Error checking user {row.get('username','?')}: {e}")

            # Test expiry check: admin-activated plans that expired → revert
            rows = conn.execute(
                "SELECT id, username, sandbox_id FROM users "
                "WHERE stripe_status IN ('active','frozen') AND test_expires_at != '' "
                "AND test_expires_at < datetime('now')"
            ).fetchall()
            for row in rows:
                print(f"[Billing] Test plan expired for {row['username']}, reverting")
                sid = _sb_cache.pop(row["id"], None)
                if sid:
                    try:
                        sb = await Sandbox.connect(sid, _sb_conn())
                        await sb.kill()
                    except:
                        pass
                if row.get("sandbox_id"):
                    try:
                        sb = Sandbox.connect(row["sandbox_id"], _sb_conn())
                        await sb.kill()
                    except:
                        pass
                conn.execute(
                    "UPDATE users SET stripe_status = 'expired', plan = '', extra_storage_gb = 0, "
                    "test_expires_at = '', sandbox_id = '' WHERE id = ?",
                    (row["id"],)
                )
                conn.commit()

            # Recovery check: users who were frozen/past_due but now active → clear grace
            rows = conn.execute(
                "SELECT id, payment_grace_start FROM users "
                "WHERE stripe_status = 'active' AND payment_grace_start != ''"
            ).fetchall()
            for row in rows:
                conn.execute("UPDATE users SET payment_grace_start = '' WHERE id = ?", (row["id"],))
            if rows:
                conn.commit()
        except Exception as e:
            print(f"[Billing] Checker error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(billing_checker())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

# ── FastAPI App ──
app = FastAPI(title="bapX API", version="0.3.0", lifespan=lifespan)
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
class PlanSelect(BaseModel):
    plan: str  # 'starter' or 'pro'
class StorageAddon(BaseModel):
    extra_gb: int  # 0-95 (total up to 100GB minus plan base)
class AdminActivatePlan(BaseModel):
    plan: str  # 'starter' or 'pro'
    extra_gb: int = 0
    duration_days: int = 30  # default 1 month test
class OAuthStartReq(BaseModel):
    provider: str
class OAuthTokenExchangeReq(BaseModel):
    flow_id: str

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

# ── OAuth Device Code Flow ──
@app.post("/api/auth/oauth/start")
@limiter.limit("10/minute")
async def oauth_start(req: OAuthStartReq, request: Request, user: dict = Depends(get_current_user)):
    """Start OAuth device code flow for a provider. Returns user_code + verification_uri."""
    provider = req.provider
    if provider not in OAUTH_CONFIGS:
        raise HTTPException(400, f"Unknown OAuth provider: {provider}")
    cfg = OAUTH_CONFIGS[provider]

    # Generate a device code flow
    flow_id = uuid.uuid4().hex
    user_code = gen_code(8)
    device_code = uuid.uuid4().hex
    verification_uri = cfg["authorization_url"]

    OAUTH_FLOWS[flow_id] = {
        "provider": provider,
        "provider_name": cfg["provider_name"],
        "user_code": user_code,
        "device_code": device_code,
        "verification_uri": verification_uri,
        "status": "pending",
        "oauth_data": None,
        "user_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "flow_id": flow_id,
        "provider_name": cfg["provider_name"],
        "user_code": user_code,
        "device_code": device_code,
        "verification_uri": verification_uri,
        "interval": 3,
    }

@app.post("/api/auth/oauth/token-exchange")
async def oauth_token_exchange(req: OAuthTokenExchangeReq, user: dict = Depends(get_current_user)):
    """Poll OAuth flow status. Returns 'completed' when token is ready."""
    flow = OAUTH_FLOWS.get(req.flow_id)
    if not flow:
        raise HTTPException(404, "Flow not found")
    if flow["user_id"] != user["id"]:
        raise HTTPException(403, "Unauthorized")

    if flow["status"] == "completed":
        # Token already exchanged — save to sandbox
        oauth_data = flow.get("oauth_data", {})
        provider = flow["provider"]
        provider_name = flow["provider_name"]

        # Write token to sandbox ~/.bapx/auth.json
        try:
            sb_status = await get_sandbox_status(user["id"])
            if sb_status.get("status") in ("running",):
                token_json = json.dumps(oauth_data, indent=2)
                # Escape for shell
                safe_json = token_json.replace("'", "'\\''")
                await exec_in_sandbox(user["id"],
                    f"mkdir -p ~/.bapx && cat > ~/.bapx/auth.json << 'BAPXEOF'\n{safe_json}\nBAPXEOF")
        except:
            pass

        return {"status": "completed", "provider": provider, "provider_name": provider_name}

    elif flow["status"] == "failed":
        return {"status": "failed", "error": flow.get("error", "Authorization failed")}

    # Simulate polling — check device code status
    import secrets
    # In production, this would poll the actual provider's token URL
    # For now, simulate completion on second poll
    if not flow.get("_poll_count"):
        flow["_poll_count"] = 1
        return {"status": "pending"}
    else:
        flow["status"] = "completed"
        flow["oauth_data"] = {
            "provider": flow["provider"],
            "access_token": f"bapx-oauth-{flow['provider']}-{secrets.token_hex(16)}",
            "token_type": "bearer",
            "expires_in": 86400,
            "scope": " ".join(OAUTH_CONFIGS.get(flow["provider"], {}).get("scopes", [])),
        }
        return {"status": "completed", "provider": flow["provider"], "provider_name": flow["provider_name"]}

# ── Provider API (list available providers and models) ──
@app.get("/api/providers")
async def list_providers(user: dict = Depends(get_current_user)):
    """List all available model providers and their models."""
    providers = []
    for key, cfg in ALL_PROVIDERS.items():
        oauth_provider_id = None
        if cfg.get("oauth"):
            # Find matching OAuth config
            for okey, ocfg in OAUTH_CONFIGS.items():
                # Match: openai → openai-oauth, anthropic → anthropic-oauth, etc.
                if okey.startswith(key) or okey.startswith(cfg.get("name", "").lower().split()[0]):
                    oauth_provider_id = okey
                    break
            if not oauth_provider_id:
                oauth_provider_id = f"{key}-oauth"
        providers.append({
            "id": key,
            "name": cfg["name"],
            "models": cfg["models"],
            "requires_key": not cfg.get("oauth"),
            "has_oauth": cfg.get("oauth", False),
            "oauth_provider_id": oauth_provider_id,
            "custom_url": cfg.get("custom_url", False),
        })
    return {"providers": providers}

@app.get("/api/providers/oauth")
async def list_oauth_providers(user: dict = Depends(get_current_user)):
    """List OAuth providers available for connection."""
    providers = []
    for key, cfg in OAUTH_CONFIGS.items():
        providers.append({
            "id": key,
            "name": cfg["provider_name"],
        })
    return {"providers": providers}

@app.get("/api/user/connected-providers")
async def list_connected_providers(user: dict = Depends(get_current_user)):
    """List providers the user has connected (from sandbox ~/.bapx/auth.json and ~/.bapx/config.toml)."""
    connected = []
    try:
        # Read auth.json from sandbox
        auth_result = await exec_in_sandbox(user["id"], "cat ~/.bapx/auth.json 2>/dev/null || echo '{}'")
        auth_data = json.loads(auth_result.get("output", "{}") or "{}")
        if auth_data.get("provider"):
            connected.append({
                "provider": auth_data["provider"],
                "method": "oauth",
                "status": "connected",
            })

        # Read config.toml for API keys
        config_result = await exec_in_sandbox(user["id"], "grep '^\\[model_providers\\.' ~/.bapx/config.toml 2>/dev/null || echo ''")
        for line in config_result.get("output", "").split("\n"):
            line = line.strip()
            if line.startswith("[model_providers."):
                provider_name = line.split(".")[1].rstrip("]")
                connected.append({
                    "provider": provider_name,
                    "method": "api_key",
                    "status": "connected",
                })
    except:
        pass

    # Also check from OAuth flow cache
    for flow_id, flow in OAUTH_FLOWS.items():
        if flow.get("user_id") == user["id"] and flow.get("status") == "completed" and flow.get("oauth_data"):
            provider = flow["oauth_data"].get("provider", flow["provider"])
            if not any(c.get("provider") == provider for c in connected):
                connected.append({
                    "provider": provider,
                    "method": "oauth",
                    "status": "connected",
                })

    return {"connected": connected}

# ── User Profile ──
@app.get("/api/user/profile")
async def user_profile(user: dict = Depends(get_current_user)):
    sandbox_status = await get_sandbox_status(user["id"]) if user.get("sandbox_id") else {"status": "none"}
    return {"id": user["id"], "username": user["username"], "name": user["name"],
        "email": user["email"], "age": user["age"], "bio": user["bio"],
        "email_verified": user["email_verified"], "is_admin": user["is_admin"],
        "sandbox_status": sandbox_status.get("status", "none"),
        "stripe_status": user.get("stripe_status", "none"),
        "payment_grace_start": user.get("payment_grace_start", "")}

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

# ── SearXNG Web Search Proxy ──
SEARXNG_URL = os.environ.get("SEARXNG_URL", "http://127.0.0.1:8888")

@app.post("/api/search")
async def search_web(req: Request, user: dict = Depends(get_current_user)):
    """Proxy web search through SearXNG (runs on host VPS, accessible from sandboxes)"""
    body = await req.json()
    query = body.get("q", "")
    if not query:
        raise HTTPException(400, "query required")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{SEARXNG_URL}/search", params={"q": query, "format": "json", "language": "en"})
            if resp.status_code != 200:
                # Fallback: try HTML parse
                resp = await client.get(f"{SEARXNG_URL}/search", params={"q": query})
                if resp.status_code != 200:
                    return {"results": [], "error": f"SearXNG returned {resp.status_code}"}
            data = resp.json()
            results = []
            for r in data.get("results", [])[:10]:
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "content": r.get("content", ""),
                    "engine": r.get("engine", ""),
                })
            return {"results": results, "count": len(results)}
    except Exception as e:
        return {"results": [], "error": str(e)[:200]}

@app.get("/api/search/status")
async def search_status(user: dict = Depends(get_current_user)):
    """Check if SearXNG is healthy"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{SEARXNG_URL}/search", params={"q": "test"})
            return {"status": "ok", "code": resp.status_code}
    except Exception as e:
        return {"status": "error", "error": str(e)[:100]}

# ── Sandbox Tools Provisioning ──
@app.post("/api/sandbox/provision-tools")
async def provision_tools_endpoint(user: dict = Depends(get_current_user)):
    """Provision all bapX built-in tools into the user's sandbox"""
    return await _provision_tools_in_sandbox(user["id"])

@app.get("/api/sandbox/tools")
async def list_sandbox_tools(user: dict = Depends(get_current_user)):
    """List bapX tools installed in the sandbox"""
    result = await exec_in_sandbox(user["id"],
        'ls ~/.bapx/tools/tool_*.py 2>/dev/null | sed "s/.*\\/tool_\\(.*\\)\\.py/\\1/" || echo ""')
    tools = [t.strip() for t in result.get("output", "").split("\n") if t.strip()]
    return {"tools": tools, "count": len(tools)}

# ── Sandbox Exec (used by frontend terminal + chat) ──
class SandboxExecReq(BaseModel):
    command: str; language: str = "bash"

@app.post("/api/sandbox/exec")
async def sandbox_exec(req: SandboxExecReq, user: dict = Depends(get_current_user)):
    """Execute a command in the user's sandbox. Used by frontend terminal and chat."""
    result = await exec_in_sandbox(user["id"], req.command)
    return {"output": result.get("output", ""), "error": result.get("error", ""), "exit_code": result.get("exit_code", 0)}

# ── Browser CDP Proxy ──
@app.get("/api/sandbox/browser/status")
async def browser_status(user: dict = Depends(get_current_user)):
    """Check if Chromium is running in the sandbox and get CDP URL"""
    # Try to find chromium/chrome process
    result = await exec_in_sandbox(user["id"],
        'pidof chromium-browser chromium google-chrome 2>/dev/null || echo "not_running"')
    pid = result.get("output", "").strip()
    if pid and pid != "not_running":
        # Get the CDP port
        cdp = await exec_in_sandbox(user["id"],
            'ss -tlnp 2>/dev/null | grep -E "9222|9223" | head -1 || echo "no_cdp"')
        return {"status": "running" if cdp.get("output","") != "no_cdp" else "no_cdp", "pid": pid}
    return {"status": "stopped"}

@app.post("/api/sandbox/browser/start")
async def browser_start(user: dict = Depends(get_current_user)):
    """Start Chromium with CDP in the sandbox"""
    result = await exec_in_sandbox(user["id"],
        'nohup chromium-browser --headless --no-sandbox --remote-debugging-port=9222 --disable-gpu 2>/dev/null & sleep 2 && echo "started" || echo "failed"')
    if "started" in result.get("output",""):
        return {"status": "started", "cdp_url": f"http://localhost:9222"}
    # Try installing
    install = await exec_in_sandbox(user["id"],
        'apt-get install -y -qq chromium-browser 2>&1 | tail -3')
    result2 = await exec_in_sandbox(user["id"],
        'nohup chromium-browser --headless --no-sandbox --remote-debugging-port=9222 --disable-gpu 2>/dev/null & sleep 3 && echo "started" || echo "failed"')
    return {"status": "started" if "started" in result2.get("output","") else "failed",
            "install_log": install.get("output","")[:200]}

@app.get("/api/sandbox/browser/screenshot")
async def browser_screenshot(user: dict = Depends(get_current_user)):
    """Take a screenshot of the current browser page in sandbox"""
    result = await exec_in_sandbox(user["id"],
        'python3 << '"'"'PYEOF'"'"'\nimport json, urllib.request\nCDP = "http://127.0.0.1:9222"\ntry:\n    resp = urllib.request.urlopen(CDP + "/json", timeout=5)\n    targets = json.loads(resp.read())\n    if not targets:\n        urllib.request.urlopen(CDP + "/json/new?about:blank", timeout=5)\n        resp = urllib.request.urlopen(CDP + "/json", timeout=5)\n        targets = json.loads(resp.read())\n    ws_url = targets[0]["webSocketDebuggerUrl"]\n    # Minimal screenshot via CDP HTTP API instead of websocket\n    page_id = targets[0]["id"]\n    req = urllib.request.Request(\n        CDP + "/json/protocol/" + page_id + "/Page.captureScreenshot",\n        data=b"{}",\n        headers={"Content-Type":"application/json"},\n        method="PUT"\n    )\n    print("screenshot_attempt")\nexcept Exception as e:\n    print(f"error:{e}")\nPYEOF')
    output = result.get("output","")
    return {"status": "attempted", "log": output[:300]}

# ── Sandbox MCPs (installed in user's ~/.bapx/) ──
@app.post("/api/sandbox/install-mcp")
async def sandbox_install_mcp(req: Request, user: dict = Depends(get_current_user)):
    """Install an MCP configuration into ~/.bapx/mcps/"""
    body = await req.json()
    name = body.get("name", "").replace("/", "").replace("..", "")
    config = body.get("config", "")
    if not name or not config:
        raise HTTPException(400, "name and config required")
    import json as _json
    try:
        if isinstance(config, str):
            _json.loads(config)  # validate JSON
    except:
        raise HTTPException(400, "config must be valid JSON")
    await exec_in_sandbox(user["id"],
        f"cat > ~/.bapx/mcps/{name}.json << 'BAPXEOF'\n{json.dumps(config) if isinstance(config, str) else config}\nBAPXEOF")
    return {"status": "ok", "mcp": f"mcps/{name}.json"}

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
    rows = conn.execute(f"SELECT id, username, name, email, email_verified, is_admin, banned, plan, extra_storage_gb, stripe_status, storage_used, test_expires_at, created_at FROM users {where} ORDER BY created_at DESC LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
    total = conn.execute(f"SELECT COUNT(*) as c FROM users {where}", params).fetchone()["c"]
    return {"users": [dict(r) for r in rows], "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@app.get("/api/admin/users/{user_id}")
def admin_get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(404, "User not found")
    return dict(user)

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
async def admin_delete(user_id: str, admin: dict = Depends(get_admin_user)):
    # Kill sandbox first
    sid = _sb_cache.pop(user_id, None)
    if sid:
        try:
            sb = await Sandbox.connect(sid, _sb_conn())
            await sb.kill()
        except:
            pass
    # Also kill via DB-stored sandbox_id
    row = conn.execute("SELECT sandbox_id FROM users WHERE id = ?", (user_id,)).fetchone()
    if row and row["sandbox_id"]:
        try:
            sb = Sandbox.connect(row["sandbox_id"], _sb_conn())
            await sb.kill()
        except:
            pass
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    return {"status": "deleted"}

@app.post("/api/admin/users/{user_id}/activate-plan")
def admin_activate_plan(user_id: str, req: AdminActivatePlan, admin: dict = Depends(get_admin_user)):
    """Manually activate a plan for a user (test/QA accounts). Sets 1-month expiry."""
    if req.plan not in PLANS:
        raise HTTPException(400, "Invalid plan. Choose 'starter' or 'pro'")
    base = _plan_base_storage(req.plan)
    max_extra = MAX_STORAGE_GB - base
    if req.extra_gb < 0 or req.extra_gb > max_extra:
        raise HTTPException(400, f"Extra storage must be 0-{max_extra}GB (total max {MAX_STORAGE_GB}GB)")

    user = conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(404, "User not found")

    expires = (datetime.now(timezone.utc) + timedelta(days=req.duration_days)).isoformat()
    conn.execute(
        "UPDATE users SET plan = ?, extra_storage_gb = ?, stripe_status = 'active', "
        "stripe_sub_id = '', payment_grace_start = '', test_expires_at = ? WHERE id = ?",
        (req.plan, req.extra_gb, expires, user_id)
    )
    conn.commit()
    total = _storage_limit_gb(req.plan, req.extra_gb)
    print(f"[Admin] Activated plan '{req.plan}' ({req.extra_gb}GB extra) for {user['username']}, expires {expires}")
    return {"status": "ok", "plan": req.plan, "extra_gb": req.extra_gb,
        "total_storage_gb": total, "expires_at": expires}

@app.post("/api/admin/users/{user_id}/update-storage")
def admin_update_storage(user_id: str, req: StorageAddon, admin: dict = Depends(get_admin_user)):
    """Admin override: set extra storage for any user."""
    user = conn.execute("SELECT id, username, plan FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(404, "User not found")
    plan = user["plan"] or ""
    if plan not in PLANS:
        raise HTTPException(400, "User has no active plan")
    base = _plan_base_storage(plan)
    max_extra = MAX_STORAGE_GB - base
    if req.extra_gb < 0 or req.extra_gb > max_extra:
        raise HTTPException(400, f"Extra storage must be 0-{max_extra}GB (total max {MAX_STORAGE_GB}GB)")

    conn.execute("UPDATE users SET extra_storage_gb = ? WHERE id = ?", (req.extra_gb, user_id))
    conn.commit()
    total = _storage_limit_gb(plan, req.extra_gb)
    return {"status": "ok", "plan": plan, "extra_gb": req.extra_gb, "total_storage_gb": total}

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
PLANS = {
    "starter": {"name": "Starter", "base_storage": 5, "price": 500},    # $5
    "pro": {"name": "Pro", "base_storage": 20, "price": 2000},          # $20
}
STORAGE_ADDON_PRICE = 100  # $1/GB
MAX_STORAGE_GB = 100

def _plan_base_storage(plan: str) -> int:
    return PLANS.get(plan, {}).get("base_storage", 0)

def _storage_limit_gb(plan: str, extra: int) -> int:
    return min(_plan_base_storage(plan) + extra, MAX_STORAGE_GB)

@app.post('/api/billing/create-checkout')
async def create_checkout(req: PlanSelect, user: dict = Depends(get_current_user)):
    if req.plan not in PLANS:
        raise HTTPException(400, "Invalid plan. Choose 'starter' or 'pro'")
    sk = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_secret_key'").fetchone()
    if not sk or not sk['value']:
        raise HTTPException(400, 'Stripe not configured')
    stripe.api_key = sk['value']
    p = PLANS[req.plan]
    sess = stripe.checkout.Session.create(mode='subscription',
        line_items=[{'price_data': {'currency': 'usd',
            'product_data': {'name': f'bapX {p["name"]} — {p["base_storage"]}GB'},
            'unit_amount': p['price']}, 'quantity': 1}],
        metadata={'user_id': user['id'], 'plan': req.plan},
        success_url='https://bapx.in/dashboard?billing=success',
        cancel_url='https://bapx.in/dashboard?billing=canceled')
    return {'url': sess.url, 'session_id': sess.id, 'plan': req.plan}

@app.post('/api/billing/update-storage')
async def update_storage(req: StorageAddon, user: dict = Depends(get_current_user)):
    """Add or remove extra storage ($1/GB/mo). Updates Stripe subscription item."""
    if user.get('stripe_status') != 'active' or not user.get('stripe_sub_id'):
        raise HTTPException(400, 'Active subscription required')
    plan = user.get('plan', '')
    if plan not in PLANS:
        raise HTTPException(400, 'No plan selected')
    base = _plan_base_storage(plan)
    max_extra = MAX_STORAGE_GB - base
    if req.extra_gb < 0 or req.extra_gb > max_extra:
        raise HTTPException(400, f'Extra storage must be 0-{max_extra}GB (total max {MAX_STORAGE_GB}GB)')

    sk = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_secret_key'").fetchone()
    price_addon = conn.execute("SELECT value FROM admin_config WHERE key = 'stripe_price_storage_addon'").fetchone()
    if not sk or not sk['value']:
        raise HTTPException(400, 'Stripe not configured')
    stripe.api_key = sk['value']
    sub_id = user['stripe_sub_id']

    try:
        sub = stripe.Subscription.retrieve(sub_id)
        existing_items = {item.price.id: item for item in sub['items']['data']}
        addon_price_id = (price_addon['value'] or 'price_bapx_addon_1gb')

        if req.extra_gb > 0:
            if addon_price_id in existing_items:
                # Update existing addon quantity
                stripe.SubscriptionItem.modify(
                    existing_items[addon_price_id].id,
                    quantity=req.extra_gb,
                )
            else:
                # Add addon line item
                stripe.Subscription.modify(sub_id,
                    items=[{'price': addon_price_id, 'quantity': req.extra_gb}],
                )
        else:
            # Remove addon if exists
            if addon_price_id in existing_items:
                stripe.SubscriptionItem.delete(existing_items[addon_price_id].id)

        conn.execute("UPDATE users SET extra_storage_gb = ? WHERE id = ?", (req.extra_gb, user['id']))
        conn.commit()
        return {'status': 'ok', 'extra_gb': req.extra_gb,
            'total_storage_gb': _storage_limit_gb(plan, req.extra_gb)}
    except Exception as e:
        raise HTTPException(500, f'Stripe error: {str(e)[:200]}')

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

    etype = event['type']
    data = event['data']['object']

    if etype == 'checkout.session.completed':
        uid = data.get('metadata', {}).get('user_id', '')
        plan = data.get('metadata', {}).get('plan', 'starter')
        if uid:
            sub_id = data.get('subscription', '')
            conn.execute(
                "UPDATE users SET stripe_sub_id = ?, stripe_status = 'active', plan = ?, "
                "payment_grace_start = '' WHERE id = ?",
                (sub_id, plan, uid)
            )
            conn.commit()
            print(f"[Billing] Plan '{plan}' active for user {uid}")

    elif etype == 'invoice.payment_failed':
        sub_id = data.get('subscription', '')
        if sub_id:
            uid = conn.execute(
                "SELECT id FROM users WHERE stripe_sub_id = ?", (sub_id,)
            ).fetchone()
            if uid:
                now = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    "UPDATE users SET stripe_status = 'past_due', payment_grace_start = ? WHERE id = ?",
                    (now, uid['id'])
                )
                conn.commit()
                print(f"[Billing] Payment failed for user {uid['id']}, grace period started")

    elif etype == 'invoice.payment_succeeded':
        sub_id = data.get('subscription', '')
        if sub_id:
            uid = conn.execute(
                "SELECT id FROM users WHERE stripe_sub_id = ?", (sub_id,)
            ).fetchone()
            if uid:
                conn.execute(
                    "UPDATE users SET stripe_status = 'active', payment_grace_start = '' WHERE id = ?",
                    (uid['id'],)
                )
                conn.commit()
                print(f"[Billing] Payment recovered for user {uid['id']}")

    elif etype == 'customer.subscription.updated':
        sub_id = data.get('id', '')
        status = data.get('status', '')
        if sub_id and status:
            uid = conn.execute(
                "SELECT id FROM users WHERE stripe_sub_id = ?", (sub_id,)
            ).fetchone()
            if uid:
                if status == 'active':
                    conn.execute(
                        "UPDATE users SET stripe_status = 'active', payment_grace_start = '' WHERE id = ?",
                        (uid['id'],)
                    )
                elif status in ('past_due', 'unpaid'):
                    if not conn.execute(
                        "SELECT id FROM users WHERE id = ? AND payment_grace_start != ''",
                        (uid['id'],)
                    ).fetchone():
                        now = datetime.now(timezone.utc).isoformat()
                        conn.execute(
                            "UPDATE users SET stripe_status = ?, payment_grace_start = ? WHERE id = ?",
                            (status, now, uid['id'])
                        )
                    else:
                        conn.execute(
                            "UPDATE users SET stripe_status = ? WHERE id = ?",
                            (status, uid['id'])
                        )
                elif status in ('canceled', 'incomplete_expired'):
                    conn.execute(
                        "UPDATE users SET stripe_status = 'canceled' WHERE id = ?",
                        (uid['id'],)
                    )
                conn.commit()

    return {'status': 'ok'}

@app.get('/api/billing/subscription')
def get_subscription(user: dict = Depends(get_current_user)):
    plan = user.get('plan', '') or ''
    extra = user.get('extra_storage_gb', 0) or 0
    base = _plan_base_storage(plan)
    total = _storage_limit_gb(plan, extra)
    plan_name = PLANS.get(plan, {}).get('name', 'None') if plan else 'None'

    grace_start = user.get('payment_grace_start', '') or ''
    freeze_at = ''
    prune_at = ''
    if grace_start:
        try:
            gs = datetime.fromisoformat(grace_start)
            freeze_at = (gs + timedelta(days=GRACE_FREEZE_DAYS)).isoformat()
            prune_at = (gs + timedelta(days=GRACE_PRUNE_DAYS)).isoformat()
        except:
            pass

    return {
        'status': user.get('stripe_status', 'none'),
        'plan': plan_name,
        'plan_id': plan,
        'base_storage_gb': base,
        'extra_storage_gb': extra,
        'storage_limit_gb': total,
        'storage_used_bytes': user.get('storage_used', 0),
        'subscription_id': user.get('stripe_sub_id', None),
        'payment_grace_start': grace_start,
        'grace_freeze_at': freeze_at,
        'grace_prune_at': prune_at,
        'available_plans': {
            pid: {'name': p['name'], 'base_storage_gb': p['base_storage'], 'price_cents': p['price']}
            for pid, p in PLANS.items()
        },
        'max_storage_gb': MAX_STORAGE_GB,
        'addon_price_cents': STORAGE_ADDON_PRICE,
        'test_expires_at': user.get('test_expires_at', '') or '',
    }

# ── Health ──
@app.get("/health")
def health():
    return {"status": "ok", "service": "bapx-api",
        "users": conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]}

# ── Streaming Chat (SSE) ──
class StreamReq(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: Optional[list] = None

@app.post("/api/sandbox/stream")
async def sandbox_stream(req: StreamReq, user: dict = Depends(get_current_user)):
    """Stream agent response from sandbox bapX via SSE."""
    async def event_stream():
        # Send session event
        yield f"data: {json.dumps({'type':'session','session_id':user['id']})}\n\n"
        
        # Send step event
        yield f"data: {json.dumps({'type':'step','step_type':'think','title':'Processing','description':req.message[:100]})}\n\n"
        
        try:
            # Ensure sandbox is running
            sb_exists = await get_sandbox_status(user["id"])
            if not sb_exists or sb_exists.get("status") not in ("running",):
                result = await start_sandbox(user["id"], user["username"])
                if result and result.get("sandbox_id"):
                    conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (result["sandbox_id"], user["id"]))
                    conn.commit()
                    yield f"data: {json.dumps({'type':'step','step_type':'think','title':'Starting sandbox...'})}\n\n"
            
            # Execute in sandbox
            escaped = req.message.replace("'", "'\\''")
            result = await exec_in_sandbox(user["id"],
                f"cd ~ && echo '{escaped}' | bapX exec --timeout 120 2>/dev/null")
            
            output = result.get("output", "") or ""
            error = result.get("error", "")
            
            if error:
                yield f"data: {json.dumps({'type':'error','message':error[:500]})}\n\n"
                yield f"data: {json.dumps({'type':'step_done','step_type':'error','title':'Error','description':error[:200]})}\n\n"
            else:
                # Send text events in chunks
                chunk_size = 500
                for i in range(0, len(output), chunk_size):
                    chunk = output[i:i+chunk_size]
                    yield f"data: {json.dumps({'type':'text','content':chunk})}\n\n"
                    await asyncio.sleep(0.01)
                
                yield f"data: {json.dumps({'type':'step_done','step_type':'check','title':'Complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type':'error','message':str(e)[:500]})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(event_stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ── Custom Domains ──
class DomainAddReq(BaseModel):
    domain: str; project: str = ""
class DomainVerifyReq(BaseModel):
    domain_id: str

@app.post("/api/user/domains")
async def add_domain(req: DomainAddReq, user: dict = Depends(get_current_user)):
    domain = req.domain.lower().strip()
    if "." not in domain or len(domain) < 4:
        raise HTTPException(400, "Invalid domain")
    existing = conn.execute("SELECT id FROM domains WHERE domain = ?", (domain,)).fetchone()
    if existing:
        raise HTTPException(409, "Domain already added")
    did = uuid.uuid4().hex
    dns_record = f"bapx-verify-{did[:8]}.{domain}"
    conn.execute("INSERT INTO domains (id, user_id, domain, project, dns_record) VALUES (?, ?, ?, ?, ?)",
        (did, user["id"], domain, req.project, dns_record))
    conn.commit()
    return {"id": did, "domain": domain, "dns_record": dns_record, "status": "pending"}

@app.get("/api/user/domains")
def list_domains(user: dict = Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM domains WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    return {"domains": [dict(r) for r in rows]}

@app.delete("/api/user/domains/{domain_id}")
def remove_domain(domain_id: str, user: dict = Depends(get_current_user)):
    conn.execute("DELETE FROM domains WHERE id = ? AND user_id = ?", (domain_id, user["id"]))
    conn.commit()
    return {"status": "deleted"}

@app.post("/api/user/domains/verify")
async def verify_domain(req: DomainVerifyReq, user: dict = Depends(get_current_user)):
    row = conn.execute("SELECT * FROM domains WHERE id = ? AND user_id = ?", (req.domain_id, user["id"])).fetchone()
    if not row:
        raise HTTPException(404, "Domain not found")
    conn.execute("UPDATE domains SET status = 'active', ssl_status = 'active' WHERE id = ?", (req.domain_id,))
    conn.commit()
    return {"status": "active", "domain": row["domain"]}

# ── Website Publishing ──
class PublishReq(BaseModel):
    project: str; domain_id: str = ""; build_command: str = "npm run build"
    output_dir: str = "dist"

@app.post("/api/user/publish")
async def publish_website(req: PublishReq, user: dict = Depends(get_current_user)):
    depl_id = uuid.uuid4().hex
    url = f"https://{req.project}.bapx.app" if not req.domain_id else ""
    # Run build in sandbox
    try:
        result = await exec_in_sandbox(user["id"],
            f"cd ~/{req.project} && {req.build_command} 2>&1 || echo 'BUILD_FAILED'")
        output = result.get("output", "")
        if "BUILD_FAILED" in output:
            conn.execute("INSERT INTO deployments (id, user_id, project, status, build_log) VALUES (?, ?, ?, 'failed', ?)",
                (depl_id, user["id"], req.project, output[:5000]))
            conn.commit()
            return {"id": depl_id, "status": "failed", "log": output[:500]}
        conn.execute("INSERT INTO deployments (id, user_id, project, status, url, build_log, deploy_time) VALUES (?, ?, ?, 'live', ?, ?, datetime('now'))",
            (depl_id, user["id"], req.project, url, output[:5000]))
        conn.commit()
        return {"id": depl_id, "status": "live", "url": url}
    except Exception as e:
        conn.execute("INSERT INTO deployments (id, user_id, project, status, build_log) VALUES (?, ?, ?, 'failed', ?)",
            (depl_id, user["id"], req.project, str(e)[:5000]))
        conn.commit()
        return {"id": depl_id, "status": "error", "error": str(e)[:200]}

@app.get("/api/user/deployments")
def list_deployments(user: dict = Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", (user["id"],)).fetchall()
    return {"deployments": [dict(r) for r in rows]}

# ── Git Repository Connections ──
class GitConnectReq(BaseModel):
    provider: str; repo_url: str; repo_name: str; branch: str = "main"; auth_token: str = ""

@app.post("/api/user/git/connect")
def connect_git(req: GitConnectReq, user: dict = Depends(get_current_user)):
    existing = conn.execute("SELECT id FROM git_connections WHERE repo_url = ? AND user_id = ?",
        (req.repo_url, user["id"])).fetchone()
    if existing:
        raise HTTPException(409, "Repository already connected")
    gid = uuid.uuid4().hex
    conn.execute("INSERT INTO git_connections (id, user_id, provider, repo_url, repo_name, branch, auth_token) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (gid, user["id"], req.provider, req.repo_url, req.repo_name, req.branch, req.auth_token))
    conn.commit()
    return {"id": gid, "repo": req.repo_name, "status": "connected"}

@app.get("/api/user/git/repos")
def list_git_repos(user: dict = Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM git_connections WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    return {"repos": [dict(r) for r in rows]}

@app.delete("/api/user/git/{git_id}")
def disconnect_git(git_id: str, user: dict = Depends(get_current_user)):
    conn.execute("DELETE FROM git_connections WHERE id = ? AND user_id = ?", (git_id, user["id"]))
    conn.commit()
    return {"status": "disconnected"}

# ── Mail Inbox (Email-based task creation) ──
@app.get("/api/user/mail/inbox")
def mail_inbox(user: dict = Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM mail_inbox WHERE user_id = ? ORDER BY received_at DESC LIMIT 50", (user["id"],)).fetchall()
    return {"messages": [dict(r) for r in rows]}

@app.post("/api/user/mail/incoming")
async def mail_incoming(request: Request):
    """Webhook endpoint for incoming mail (configurable via mailgun/sendgrid)."""
    body = await request.json()
    from_addr = body.get("from", "")
    to_addr = body.get("to", "")
    subject = body.get("subject", "")
    text = body.get("text", "") or body.get("body", "") or body.get("stripped-text", "")
    if not from_addr or not to_addr:
        return {"status": "ignored"}
    # Find user by mail address
    user = conn.execute("SELECT id, username FROM users WHERE email = ?", (to_addr,)).fetchone()
    if not user:
        return {"status": "user_not_found"}
    conn.execute("INSERT INTO mail_inbox (user_id, from_addr, to_addr, subject, body) VALUES (?, ?, ?, ?, ?)",
        (user["id"], from_addr, to_addr, subject, text[:10000]))
    conn.commit()
    return {"status": "ok"}

# ── Static Files & Dashboard SPA route ──
@app.get("/dashboard")
async def dashboard_spa():
    return FileResponse(str(STATIC_DIR / "dashboard.html"))

app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# ── Main ──
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "7654"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
