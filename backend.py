"""
bapX Backend — Python FastAPI
Replaces the TypeScript Fastify backend with pure Python.
"""
import os, uuid, json, sqlite3, hashlib, hmac, time, subprocess, glob
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, field_validator
from passlib.hash import bcrypt
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ── Config ──────────────────────────────────────────────────────────────
JWT_SECRET: str = os.environ.get("BAPX_JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("FATAL: Set BAPX_JWT_SECRET (32+ chars)")

JWT_ALGO = "HS256"
JWT_EXPIRY_HOURS = 72
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("BAPX_DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)
# User-defined skills are stored per-user in DB, not from external sources

# ── DB ──────────────────────────────────────────────────────────────────
conn = sqlite3.connect(str(DATA_DIR / "bapx.db"), check_same_thread=False)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")

conn.executescript("""
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    age TEXT DEFAULT '',
    nature TEXT DEFAULT '',
    agent_name TEXT DEFAULT 'BapX',
    bio TEXT DEFAULT '',
    soul_md TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    provider TEXT DEFAULT 'openai',
    model TEXT DEFAULT '',
    oauth_provider TEXT DEFAULT '',
    custom_providers TEXT DEFAULT '[]',
    fallback_providers TEXT DEFAULT '[]',
    pooled_credentials TEXT DEFAULT '[]',
    skills_enabled TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT DEFAULT 'New Chat',
    messages TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS cron_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    task TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS saved_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    label TEXT DEFAULT '',
    api_key TEXT DEFAULT '',
    base_url TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
""")
conn.commit()

# ── FastAPI App ─────────────────────────────────────────────────────────
app = FastAPI(title="bapX API", version="1.0.0")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.environ.get("BAPX_CORS_ORIGINS",
    "https://bapx.in,https://agent.bapx.in,http://localhost:7654").split(",")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# ── Auth Helpers ────────────────────────────────────────────────────────
def make_token(user_id: str) -> str:
    return jwt.encode({
        "sub": user_id, "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }, JWT_SECRET, algorithm=JWT_ALGO)

def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = conn.execute("SELECT * FROM users WHERE id = ?", (payload["sub"],)).fetchone()
    if not user:
        raise HTTPException(401, "User not found")
    return dict(user)

# ── Pydantic Models ─────────────────────────────────────────────────────
class SignupReq(BaseModel):
    username: str
    name: str
    email: str
    password: str
    age: str = ""
    nature: str = ""
    agent_name: str = "BapX"
    bio: str = ""

class LoginReq(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    nature: Optional[str] = None
    agent_name: Optional[str] = None
    bio: Optional[str] = None

class ApiKeyUpdate(BaseModel):
    provider: Optional[str] = None
    key: Optional[str] = None
    model: Optional[str] = None

class OAuthSave(BaseModel):
    provider: str

class SkillsUpdate(BaseModel):
    skills: list[str]  # List of skill names to add

class ChatSend(BaseModel):
    message: str
    session_id: Optional[str] = None

ALLOWED_OAUTH_PROVIDERS = [
    "openai-codex", "anthropic-oauth", "xai-oauth",
    "google-gemini-oauth", "nous", "minimax-oauth"
]
ALLOWED_PROVIDERS = [
    "openrouter","openai","anthropic","google","deepseek","groq",
    "together","mistral","cohere","perplexity","nvidia-nim","xai",
    "huggingface","kimi","minimax","zai","xiaomi","stepfun",
    "arcee","gmi-cloud","ollama-cloud","lm-studio","aws-bedrock",
    "azure-foundry","qwen-oauth","tencent","custom"
]

# ── Routes ──────────────────────────────────────────────────────────────

# ── Auth ──
@app.post("/api/signup")
@limiter.limit("10/minute")
def signup(req: SignupReq, request: Request):
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be 8+ characters")
    if not all(c.isalnum() or c in '_-' for c in req.username) or len(req.username) < 3:
        raise HTTPException(400, "Username: 3+ alphanumeric/chars")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(400, "Invalid email")

    if conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone():
        raise HTTPException(409, "Username taken")
    if conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone():
        raise HTTPException(409, "Email registered")

    uid = uuid.uuid4().hex
    agent_name = req.agent_name or "BapX"
    soul = f"""# SOUL.md — {req.name}'s Agent

## Who You Are
**Name:** {req.name} | **Username:** {req.username}
{('**Age:** ' + req.age) if req.age else ''}
{('**Nature:** ' + req.nature) if req.nature else ''}
{('**Bio:** ' + req.bio) if req.bio else ''}

## Your Agent: {agent_name}
Your agent works for you autonomously — executing tasks, managing memory, building skills.

## Directives
- BYOK: your agent uses YOUR API key
- Persistent memory of preferences, projects, workflows
- Isolated sandbox — no cross-user access
"""

    conn.execute("""INSERT INTO users
        (id, username, name, email, password_hash, age, nature, agent_name, bio, soul_md)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (uid, req.username, req.name, req.email,
         bcrypt.hash(req.password), req.age, req.nature,
         agent_name, req.bio, soul))
    conn.commit()

    return {"token": make_token(uid), "user": {
        "id": uid, "username": req.username, "name": req.name,
        "email": req.email, "provider": "openai", "model": ""
    }}

@app.post("/api/login")
@limiter.limit("20/minute")
def login(req: LoginReq, request: Request):
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user or not bcrypt.verify(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(user["id"]), "user": dict(user)}

# ── User Profile ──
@app.get("/api/user/profile")
def user_profile(user: dict = Depends(get_current_user)):
    key = user["api_key"]
    return {
        "id": user["id"], "username": user["username"],
        "name": user["name"], "email": user["email"],
        "age": user["age"], "nature": user["nature"],
        "agent_name": user["agent_name"], "bio": user["bio"],
        "soul_md": user["soul_md"],
        "provider": user["provider"],
        "api_key": ("••••" + key[-4:]) if key else "",
        "model": user["model"],
        "oauth_provider": user["oauth_provider"],
        "custom_providers": json.loads(user["custom_providers"]),
        "fallback_providers": json.loads(user["fallback_providers"]),
        "pooled_credentials": json.loads(user["pooled_credentials"]),
        "skills_enabled": json.loads(user["skills_enabled"]),
    }

@app.put("/api/user/profile")
def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = []
    vals = []
    for field in ("name", "age", "nature", "agent_name", "bio"):
        val = getattr(req, field, None)
        if val is not None:
            updates.append(f"{field} = ?")
            vals.append(val)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    vals.append(user["id"])
    conn.execute(f"UPDATE users SET {', '.join(updates)}, updated_at = datetime('now') WHERE id = ?", vals)
    conn.commit()
    return {"status": "ok"}

# ── API Key ──
@app.put("/api/user/api-key")
def update_api_key(req: ApiKeyUpdate, user: dict = Depends(get_current_user)):
    updates = []
    vals = []
    if req.key is not None and req.key != "":
        if len(req.key) < 8:
            raise HTTPException(400, "Key must be 8+ chars")
        if not req.key.startswith("••••"):
            updates.append("api_key = ?"); vals.append(req.key)
    if req.provider:
        if req.provider not in ALLOWED_PROVIDERS:
            raise HTTPException(400, f"Invalid provider")
        updates.append("provider = ?"); vals.append(req.provider)
    if req.model is not None:
        updates.append("model = ?"); vals.append(req.model)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    vals.append(user["id"])
    conn.execute(f"UPDATE users SET {', '.join(updates)}, updated_at = datetime('now') WHERE id = ?", vals)
    conn.commit()
    return {"status": "ok"}

# ── OAuth ──
@app.post("/api/auth/oauth/start")
def oauth_start(req: OAuthSave, user: dict = Depends(get_current_user)):
    if req.provider not in ALLOWED_OAUTH_PROVIDERS:
        raise HTTPException(400, f"Invalid OAuth provider. Allowed: {', '.join(ALLOWED_OAUTH_PROVIDERS)}")
    conn.execute("UPDATE users SET oauth_provider = ?, updated_at = datetime('now') WHERE id = ?",
                 (req.provider, user["id"]))
    conn.commit()
    return {"provider": req.provider, "status": "configured"}

@app.post("/api/auth/oauth/save")
def oauth_save(req: OAuthSave, user: dict = Depends(get_current_user)):
    if req.provider not in ALLOWED_OAUTH_PROVIDERS:
        raise HTTPException(400, f"Invalid OAuth provider")
    conn.execute("UPDATE users SET oauth_provider = ?, provider = 'oauth', updated_at = datetime('now') WHERE id = ?",
                 (req.provider, user["id"]))
    conn.commit()
    return {"provider": req.provider, "status": "saved"}

# ── User Skills (stored in DB, user-defined) ──
def get_user_skills(user_id: str) -> list:
    """Return user-defined skills from their sandbox."""
    row = conn.execute("SELECT skills_enabled FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        return []
    try:
        return json.loads(row["skills_enabled"])
    except (json.JSONDecodeError, TypeError):
        return []

@app.get("/api/skills")
def get_skills(user: dict = Depends(get_current_user)):
    """Return user's personal skills (self-learning, stored in sandbox)."""
    return {"skills": get_user_skills(user["id"])}

@app.post("/api/skills/save")
def save_skill(req: SkillsUpdate, user: dict = Depends(get_current_user)):
    """User saves a new skill from their sandbox workflow."""
    current = get_user_skills(user["id"])
    existing_names = {s["name"] for s in current}
    new = [s for s in req.skills if s not in existing_names]
    updated = current + new
    conn.execute("UPDATE users SET skills_enabled = ?, updated_at = datetime('now') WHERE id = ?",
                 (json.dumps(updated), user["id"]))
    conn.commit()
    return {"status": "ok", "count": len(updated)}

# ── Chat ──
@app.post("/api/chat/send")
async def chat_send(req: ChatSend, user: dict = Depends(get_current_user)):
    """Direct LLM call via user's configured provider + API key."""
    import httpx

    provider = user.get("provider", "openai")
    api_key = user.get("api_key", "")
    model = user.get("model", "gpt-4o")
    
    if not api_key:
        raise HTTPException(400, "Configure an API key in Settings first")

    # Map provider to base URL
    provider_urls = {
        "openai": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com/v1",
        "google": "https://generativelanguage.googleapis.com/v1beta",
        "deepseek": "https://api.deepseek.com/v1",
        "openrouter": "https://openrouter.ai/api/v1",
        "groq": "https://api.groq.com/openai/v1",
        "xai": "https://api.x.ai/v1",
    }
    base_url = provider_urls.get(provider, "https://api.openai.com/v1")

    # Save message to session
    sid = req.session_id or uuid.uuid4().hex
    if not req.session_id:
        conn.execute("INSERT INTO sessions (id, user_id) VALUES (?, ?)", (sid, user["id"]))
    
    # Get or create session messages
    session = conn.execute("SELECT messages FROM sessions WHERE id = ? AND user_id = ?",
                          (sid, user["id"])).fetchone()
    messages = json.loads(session["messages"]) if session else []
    messages.append({"role": "user", "content": req.message})

    async def stream():
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream("POST",
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True,
                    },
                    timeout=120,
                ) as resp:
                    full_response = ""
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            yield f"data: {data}\n\n"
                    # Save response
                    messages.append({"role": "assistant", "content": full_response})
                    conn.execute("UPDATE sessions SET messages = ? WHERE id = ?",
                                (json.dumps(messages), sid))
                    conn.commit()
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"X-Session-Id": sid})

@app.get("/api/sessions")
def list_sessions(user: dict = Depends(get_current_user)):
    rows = conn.execute(
        "SELECT id, title, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        (user["id"],)).fetchall()
    return {"sessions": [dict(r) for r in rows]}

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    conn.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?", (session_id, user["id"]))
    conn.commit()
    return {"status": "deleted"}

# ── Sandbox ──
@app.post("/api/sandbox/start")
def sandbox_start(user: dict = Depends(get_current_user)):
    try:
        result = subprocess.run(
            ["docker", "run", "-d", "--name", f"bapx-{user['username']}",
             "-e", f"API_KEY={user['api_key']}",
             "-e", f"PROVIDER={user['provider']}",
             "-e", f"MODEL={user['model']}",
             "-e", f"SOUL_MD={user['soul_md']}",
             "-m", "512m", "--cpus", "0.5",
             "bapx-agent:latest"],
            capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise HTTPException(500, f"Sandbox start failed: {result.stderr}")
        return {"status": "started", "container": f"bapx-{user['username']}"}
    except FileNotFoundError:
        raise HTTPException(500, "Docker not available")

@app.post("/api/sandbox/stop")
def sandbox_stop(user: dict = Depends(get_current_user)):
    subprocess.run(["docker", "stop", f"bapx-{user['username']}"], capture_output=True, timeout=10)
    subprocess.run(["docker", "rm", f"bapx-{user['username']}"], capture_output=True, timeout=10)
    return {"status": "stopped"}

@app.get("/api/sandbox/status")
def sandbox_status(user: dict = Depends(get_current_user)):
    result = subprocess.run(
        ["docker", "ps", "--filter", f"name=bapx-{user['username']}",
         "--format", "{{.Status}}"],
        capture_output=True, text=True, timeout=10)
    running = bool(result.stdout.strip())
    return {"running": running, "status": result.stdout.strip() or "not running"}

# ── Providers list ──
@app.get("/api/providers")
def list_providers():
    return {"providers": [
        {"id": p, "name": p.replace("-", " ").title(), "auth": "API key"}
        for p in ALLOWED_PROVIDERS
    ], "oauth_providers": [
        {"id": p, "name": p.replace("-oauth", "").replace("-", " ").title(),
         "auth": "OAuth"}
        for p in ALLOWED_OAUTH_PROVIDERS
    ]}

# ── Health ──
@app.get("/health")
def health():
    user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    return {"status": "ok", "service": "bapx-api", "users": user_count}

# ── Static Files ──
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# ── Main ──
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "7654"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
