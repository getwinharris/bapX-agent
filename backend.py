"""
bapX Backend — Python FastAPI
Model connections: API key providers (OpenAI, Anthropic, Google, etc.) + OAuth device flow.
"""
import os, uuid, json, sqlite3, hashlib, hmac, time, httpx, asyncio, tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.background import BackgroundTasks
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
import hashlib, secrets
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from agent_runtime import stream_agent_response
from sandbox_manager import start_sandbox, stop_sandbox, get_sandbox_status, exec_in_sandbox
from agent_orchestrator import route_user_message
from opensandbox import Sandbox

# ── Config ──
JWT_SECRET: str = os.environ.get("BAPX_JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("FATAL: Set BAPX_JWT_SECRET (32+ chars)")
JWT_ALGO = "HS256"
JWT_EXPIRY_HOURS = 72
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = Path(os.environ.get("BAPX_DATA_DIR", str(BASE_DIR / "data")))
SKILLS_DIR = DATA_DIR / "skills"
SKILLS_DIR.mkdir(parents=True, exist_ok=True)

# ── DB ──
conn = sqlite3.connect(str(DATA_DIR / "bapx.db"), check_same_thread=False, timeout=10)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=5000")
conn.execute("PRAGMA foreign_keys=ON")

conn.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, age TEXT DEFAULT '', nature TEXT DEFAULT '', agent_name TEXT DEFAULT 'BapX', bio TEXT DEFAULT '', soul_md TEXT DEFAULT '', api_key TEXT DEFAULT '', provider TEXT DEFAULT 'openai', model TEXT DEFAULT '', oauth_tokens TEXT DEFAULT '{}', skills_enabled TEXT DEFAULT '[]', is_admin INTEGER DEFAULT 0, banned INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))")
conn.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT DEFAULT 'New Chat', messages TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS oauth_flows (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, device_code TEXT NOT NULL, user_code TEXT NOT NULL, verification_uri TEXT NOT NULL, status TEXT DEFAULT 'pending', expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, session_id TEXT NOT NULL DEFAULT '', key TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
# Admin tables
conn.execute("CREATE TABLE IF NOT EXISTS admin_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))")
conn.execute("CREATE TABLE IF NOT EXISTS admin_mail (id INTEGER PRIMARY KEY AUTOINCREMENT, from_addr TEXT NOT NULL, to_addr TEXT NOT NULL, subject TEXT, body TEXT, read INTEGER DEFAULT 0, received_at TEXT DEFAULT (datetime('now')))")
conn.execute("CREATE TABLE IF NOT EXISTS admin_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, severity TEXT DEFAULT 'info', read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))")
conn.execute("CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, session_id TEXT NOT NULL DEFAULT '', key TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id)")
conn.execute("""CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
)""")
# Add sandbox_id column to users if not present (idempotent migration)
try:
    conn.execute("ALTER TABLE users ADD COLUMN sandbox_id TEXT DEFAULT ''")
except Exception:
    pass
conn.commit()
for col_sql in [
    "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0",
]:
    try: conn.execute(col_sql)
    except: pass
conn.commit()

# ── Seed admin user ──
admin_exists = conn.execute("SELECT id FROM users WHERE is_admin = 1").fetchone()
if not admin_exists:
    admin_pw = os.environ.get("BAPX_ADMIN_PASSWORD", "admin123")
    admin_uid = uuid.uuid4().hex
    conn.execute("INSERT INTO users (id, username, name, email, password_hash, is_admin) VALUES (?, ?, ?, ?, ?, 1)",
        (admin_uid, "admin", "Admin", "admin@bapx.in", hashlib.sha256(admin_pw.encode()).hexdigest()))
    conn.commit()
    print(f"[Admin] Seeded admin user: admin@bapx.in (pw: {'[ENV]' if 'BAPX_ADMIN_PASSWORD' in os.environ else 'admin123'})")

# Seed default admin config
DEFAULT_CONFIG = {
    "stripe_secret_key": "", "stripe_webhook_secret": "",
    "google_oauth_client_id": "", "google_oauth_client_secret": "",
    "smtp_host": "", "smtp_port": "587", "smtp_user": "", "smtp_pass": "",
    "admin_email": "", "billing_plan_base_price": "5",
    "billing_storage_price_per_gb": "1",
}
for k, v in DEFAULT_CONFIG.items():
    existing = conn.execute("SELECT key FROM admin_config WHERE key = ?", (k,)).fetchone()
    if not existing:
        conn.execute("INSERT INTO admin_config (key, value) VALUES (?, ?)", (k, v))
conn.commit()

# ── FastAPI App ──
app = FastAPI(title="bapX API", version="0.2.0")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CORS_ORIGINS = os.environ.get("BAPX_CORS_ORIGINS",
    "https://bapx.in,https://agent.bapx.in,http://localhost:7654").split(",")
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS,
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# ── Auth Helpers ──
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

def get_admin_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = conn.execute("SELECT * FROM users WHERE id = ? AND is_admin = 1", (payload["sub"],)).fetchone()
    if not user:
        raise HTTPException(403, "Admin access required")
    return dict(user)

def mask_value(val: str) -> str:
    """Mask sensitive config values for GET responses."""
    s = val.strip()
    if not s:
        return ""
    if len(s) <= 8:
        return "••••"
    return s[:4] + "••••" + s[-4:]

def create_notification(type_: str, title: str, message: str, severity: str = "info"):
    conn.execute("INSERT INTO admin_notifications (type, title, message, severity) VALUES (?, ?, ?, ?)",
                 (type_, title, message, severity))
    conn.commit()

# ── Pydantic Models ──
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

class OAuthStartReq(BaseModel):
    provider: str

class OAuthPollReq(BaseModel):
    flow_id: str

class SkillsUpdate(BaseModel):
    skills: list[str]

class ChatSend(BaseModel):
    message: str
    session_id: Optional[str] = None

class TTSReq(BaseModel):
    text: str

class MemorySave(BaseModel):
    key: str
    value: str
    session_id: str = ""

class AgentRunReq(BaseModel):
    message: str
    session_id: Optional[str] = None

class SandboxStartReq(BaseModel):
    pass

class SandboxExecReq(BaseModel):
    command: str
    language: str = "bash"

# ── Admin Models ──
class AdminLoginReq(BaseModel):
    email: str
    password: str

class ConfigUpdateReq(BaseModel):
    key: str
    value: str

class AdminNotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    severity: str = "info"

class AdminActionResp(BaseModel):
    status: str
    message: str = ""

# ── ALL providers ──
ALL_PROVIDERS = {
    # API Key providers
    "openai":     {"name": "OpenAI",          "auth": "api_key", "models": ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo","o1","o1-mini","o3-mini"], "base_url": "https://api.openai.com/v1"},
    "anthropic":  {"name": "Anthropic",       "auth": "api_key", "models": ["claude-sonnet-4","claude-3.5-sonnet","claude-3-opus","claude-3-haiku"], "base_url": "https://api.anthropic.com/v1"},
    "google":     {"name": "Google Gemini",   "auth": "api_key", "models": ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-pro","gemini-1.5-flash"], "base_url": "https://generativelanguage.googleapis.com/v1beta"},
    "deepseek":   {"name": "DeepSeek",        "auth": "api_key", "models": ["deepseek-chat","deepseek-reasoner"], "base_url": "https://api.deepseek.com/v1"},
    "openrouter": {"name": "OpenRouter",      "auth": "api_key", "models": ["openrouter/auto"], "base_url": "https://openrouter.ai/api/v1"},
    "xai":        {"name": "xAI Grok",        "auth": "api_key", "models": ["grok-2","grok-2-vision"], "base_url": "https://api.x.ai/v1"},
    "groq":       {"name": "Groq",            "auth": "api_key", "models": ["llama-3.3-70b-versatile","mixtral-8x7b-32768","deepseek-r1-distill-llama-70b"], "base_url": "https://api.groq.com/openai/v1"},
    "mistral":    {"name": "Mistral",         "auth": "api_key", "models": ["mistral-large-latest","mistral-small-latest","codestral-latest"], "base_url": "https://api.mistral.ai/v1"},
    "together":   {"name": "Together AI",     "auth": "api_key", "models": ["meta-llama/Llama-3.3-70B-Instruct-Turbo","deepseek-ai/DeepSeek-R1"], "base_url": "https://api.together.xyz/v1"},
    "cohere":     {"name": "Cohere",          "auth": "api_key", "models": ["command-r-plus","command-r"], "base_url": "https://api.cohere.com/v1"},
    "perplexity": {"name": "Perplexity",      "auth": "api_key", "models": ["sonar-pro","sonar","sonar-deep-research"], "base_url": "https://api.perplexity.ai"},
    "huggingface":{"name": "Hugging Face",    "auth": "api_key", "models": ["meta-llama/Llama-3.3-70B-Instruct"], "base_url": "https://api-inference.huggingface.co/v1"},
    "minimax":    {"name": "MiniMax",         "auth": "api_key", "models": ["minimax-text-01"], "base_url": "https://api.minimax.chat/v1"},
    "kimi":       {"name": "Kimi Moonshot",   "auth": "api_key", "models": ["moonshot-v1-8k","moonshot-v1-32k","moonshot-v1-128k"], "base_url": "https://api.moonshot.cn/v1"},
    "xiaomi":     {"name": "Xiaomi MiMo",     "auth": "api_key", "models": ["mimo-pro"], "base_url": "https://api.mimo.one/v1"},
    "zai":        {"name": "Z.AI GLM",        "auth": "api_key", "models": ["glm-4-plus","glm-4-flash"], "base_url": "https://open.bigmodel.cn/api/paas/v4"},
    "dashscope":  {"name": "Alibaba DashScope","auth": "api_key", "models": ["qwen-plus","qwen-max","qwen-turbo"], "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1"},
    "stepfun":    {"name": "StepFun",         "auth": "api_key", "models": ["step-1-8k","step-2-16k"], "base_url": "https://api.stepfun.com/v1"},
    # OAuth providers — real ChatGPT & Claude login via device code flow
    "openai-oauth":    {"name": "ChatGPT (OpenAI)",    "auth": "oauth", "models": ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo","o1","o1-mini","o3-mini"], "oauth_type": "openai_real"},
    "anthropic-oauth": {"name": "Claude (Anthropic)",  "auth": "oauth", "models": ["claude-sonnet-4","claude-3.5-sonnet","claude-3-opus","claude-3-haiku","claude-3.5-haiku"], "oauth_type": "anthropic_real"},
    "google-oauth":    {"name": "Google (OAuth)",      "auth": "oauth", "models": ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-pro"], "oauth_type": "google_real"},
    "nous-oauth":      {"name": "Nous Portal",         "auth": "oauth", "models": ["nous/hermes-4","nous/research-1"], "oauth_type": "nous"},
    "qwen-oauth":      {"name": "Qwen (Alibaba)",      "auth": "oauth", "models": ["qwen-max","qwen-plus"], "oauth_type": "qwen"},
    # Copilot / Token-based
    "github-copilot":  {"name": "GitHub Copilot",      "auth": "copilot", "models": ["gpt-4o-copilot","claude-sonnet-copilot"], "oauth_type": "copilot"},
}

OAUTH_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "oauth"}
API_KEY_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "api_key"}
COPILOT_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "copilot"}

# ── Device Flow OAuth configurations ──
# Real provider OAuth: Users authenticate with THEIR OWN ChatGPT/Claude/Google accounts
# The proxy endpoint (v1/chat/completions) routes requests using the user's stored token
OAUTH_CONFIGS = {
    "openai_real": {
        "client_id": "bapx-device-flow",
        "scopes": ["openai_api", "models.read", "models.write"],
        "device_url": "https://auth.openai.com/oauth/device/code",
        "token_url": "https://auth.openai.com/oauth/token",
        "auth_url": "https://auth.openai.com/oauth/device",
        "headers": {"Accept": "application/json"},
        "proxies_to": {"base_url": "https://api.openai.com/v1", "provider": "openai"},
    },
    "anthropic_real": {
        "client_id": "bapx-device-flow",
        "scopes": ["anthropic_api", "models.read"],
        "device_url": "https://auth.anthropic.com/oauth/device/code",
        "token_url": "https://auth.anthropic.com/oauth/token",
        "auth_url": "https://auth.anthropic.com/oauth/device",
        "headers": {"Accept": "application/json"},
        "proxies_to": {"base_url": "https://api.anthropic.com/v1", "provider": "anthropic"},
    },
    "google_real": {
        "client_id": "bapx-device-flow",
        "scopes": ["https://www.googleapis.com/auth/generative-language"],
        "device_url": "https://oauth2.googleapis.com/device/code",
        "token_url": "https://oauth2.googleapis.com/token",
        "auth_url": "https://oauth2.googleapis.com/oauth/device",
        "headers": {"Accept": "application/json"},
        "proxies_to": {"base_url": "https://generativelanguage.googleapis.com/v1beta", "provider": "google"},
    },
    "nous": {
        "client_id": "bapx-device-flow",
        "scopes": ["openai_api"],
        "device_url": "https://nousresearch.com/device/code",
        "token_url": "https://nousresearch.com/device/token",
        "auth_url": "https://nousresearch.com/device",
        "headers": {"Accept": "application/json"},
    },
    "qwen": {
        "client_id": "bapx-device-flow",
        "scopes": ["qwen_api"],
        "device_url": "https://dashscope.aliyuncs.com/device/code",
        "token_url": "https://dashscope.aliyuncs.com/device/token",
        "auth_url": "https://dashscope.aliyuncs.com/device",
        "headers": {"Accept": "application/json"},
    },
    "copilot": {
        "client_id": "bapx-device-flow",
        "scopes": ["copilot_api"],
        "device_url": "https://github.com/login/device/code",
        "token_url": "https://github.com/login/oauth/access_token",
        "auth_url": "https://github.com/login/device",
        "headers": {"Accept": "application/json"},
    },
}

# ── Skills loader ──
# Also load Hermes bundled skills from the copied directory
HERMES_SKILLS_DIR = Path("/usr/local/lib/hermes-agent/skills")
def load_default_skills() -> list[dict]:
    """Load all SKILL.md files from bapX + Hermes skills directories."""
    skills = []
    dirs = []
    if SKILLS_DIR.exists():
        dirs.append(SKILLS_DIR)
    if HERMES_SKILLS_DIR.exists():
        dirs.append(HERMES_SKILLS_DIR)
    for skills_dir in dirs:
        for path in skills_dir.rglob("SKILL.md"):
            try:
                content = path.read_text(encoding="utf-8", errors="replace")
                name = path.parent.name
                desc = ""
                category = path.parent.parent.name if path.parent.parent != skills_dir else ""
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        fm = parts[1]
                        for line in fm.split("\n"):
                            if line.startswith("description:"):
                                desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                                break
                if not any(s["name"] == name for s in skills):
                    skills.append({
                        "name": name,
                        "description": desc or "No description",
                        "category": category if category and category != "SKILL.md" else "general",
                        "path": str(path),
                    })
            except Exception:
                continue
    return skills

DEFAULT_SKILLS_CACHE = None
def get_default_skills() -> list[dict]:
    global DEFAULT_SKILLS_CACHE
    if DEFAULT_SKILLS_CACHE is None:
        DEFAULT_SKILLS_CACHE = load_default_skills()
    return DEFAULT_SKILLS_CACHE

# ── Routes ──
# ── Auth ──
@app.post("/api/signup")
@limiter.limit("10/minute")
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
    agent_name = req.agent_name or "BapX"
    soul = f"""# SOUL.md — {req.name}'s Agent

## Who You Are
**Name:** {req.name} | **Username:** {req.username}
{('**Age:** ' + req.age) if req.age else ''}
{('**Nature:** ' + req.nature) if req.nature else ''}
{('**Bio:** ' + req.bio) if req.bio else ''}

## Your Agent: {agent_name}
Your agent works for you autonomously — executing tasks, managing memory, building skills.

## Capabilities
- Full model access via API key or OAuth login
- All built-in bapX skills
- Isolated sandbox
"""
    conn.execute("""INSERT INTO users
        (id, username, name, email, password_hash, age, nature, agent_name, bio, soul_md)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (uid, req.username, req.name, req.email,
         hashlib.sha256(req.password.encode()).hexdigest(), req.age, req.nature,
         agent_name, req.bio, soul))
    conn.commit()
    # Create OpenSandbox sandbox for new user
    sandbox_id = ""
    try:
        sandbox_conn_cfg = type("ConnectionConfig", (), {
            "get_base_url": lambda self: "http://127.0.0.1:8080",
            "get_api_key": lambda self: "",
        })()
        sb = await Sandbox.create(
            "ubuntu",
            connection_config=sandbox_conn_cfg,
            resource={"cpu": "500m", "memory": "1Gi"},
            metadata={"user_id": uid, "name": req.username},
            timeout=timedelta(hours=1),
            skip_health_check=True,
        )
        sandbox_id = getattr(sb, "sandbox_id", getattr(sb, "id", ""))
        if sandbox_id:
            conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (sandbox_id, uid))
            conn.execute("INSERT INTO sandboxes (id, user_id, sandbox_id, status) VALUES (?, ?, ?, 'running')",
                         (uuid.uuid4().hex, uid, sandbox_id))
            conn.commit()
    except Exception as e:
        print(f"[Sandbox] Signup sandbox creation skipped: {e}")
    return {"token": make_token(uid), "user": {
        "id": uid, "username": req.username, "name": req.name,
        "email": req.email, "provider": "openai", "model": ""
    }}

@app.post("/api/login")
@limiter.limit("20/minute")
def login(req: LoginReq, request: Request):
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    if not user or not hashlib.sha256(req.password.encode()).hexdigest() == user["password_hash"]:
        raise HTTPException(401, "Invalid credentials")
    return {"token": make_token(user["id"]), "user": dict(user)}

# ── Providers ──
@app.get("/api/providers")
def list_providers():
    """Return all providers with their auth methods."""
    api_key_provs = []
    oauth_provs = []
    copilot_provs = []
    for pid, p in ALL_PROVIDERS.items():
        entry = {
            "id": pid,
            "name": p["name"],
            "auth": p["auth"],
            "models": p.get("models", []),
            "oauth_type": p.get("oauth_type", None),
        }
        if p["auth"] == "oauth":
            oauth_provs.append(entry)
        elif p["auth"] == "copilot":
            copilot_provs.append(entry)
        else:
            api_key_provs.append(entry)
    return {
        "api_key": api_key_provs,
        "oauth": oauth_provs,
        "copilot": copilot_provs,
    }

# ── User Settings ──
@app.get("/api/user/profile")
async def user_profile(user: dict = Depends(get_current_user)):
    key = user["api_key"]
    try:
        oauth_tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
    except Exception:
        oauth_tokens = {}
    try:
        skills_enabled = json.loads(user["skills_enabled"]) if user["skills_enabled"] else []
    except Exception:
        skills_enabled = []
    # Check sandbox status
    sandbox_status = await get_sandbox_status(user["id"])
    return {
        "id": user["id"], "username": user["username"],
        "name": user["name"], "email": user["email"],
        "age": user["age"], "nature": user["nature"],
        "agent_name": user["agent_name"], "bio": user["bio"],
        "soul_md": user["soul_md"],
        "provider": user["provider"],
        "api_key": ("••••" + key[-4:]) if key else "",
        "model": user["model"],
        "oauth_tokens": {k: "••••" + v[-4:] if len(v) > 8 else "••••" for k, v in oauth_tokens.items()},
        "skills_enabled": skills_enabled,
        "sandbox_status": sandbox_status.get("status", "none"),
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

# ── API Key Auth ──
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
        if req.provider not in ALL_PROVIDERS or ALL_PROVIDERS[req.provider]["auth"] not in ("api_key",):
            raise HTTPException(400, "Invalid API key provider")
        updates.append("provider = ?"); vals.append(req.provider)
    if req.model is not None:
        updates.append("model = ?"); vals.append(req.model)
    if not updates:
        raise HTTPException(400, "Nothing to update")
    vals.append(user["id"])
    conn.execute(f"UPDATE users SET {', '.join(updates)}, updated_at = datetime('now') WHERE id = ?", vals)
    conn.commit()
    return {"status": "ok"}

# ── OAuth Device Flow ──
@app.post("/api/auth/oauth/start")
async def oauth_start(req: OAuthStartReq, user: dict = Depends(get_current_user)):
    """Start OAuth device flow for a model provider."""
    if req.provider not in ALL_PROVIDERS:
        raise HTTPException(400, f"Unknown provider: {req.provider}")
    provider_info = ALL_PROVIDERS[req.provider]
    oauth_type = provider_info.get("oauth_type")
    if not oauth_type or oauth_type not in OAUTH_CONFIGS:
        raise HTTPException(400, f"No OAuth config for {req.provider}")

    import random
    cfg = OAUTH_CONFIGS[oauth_type]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cfg["device_url"],
                json={"client_id": cfg["client_id"], "scope": " ".join(cfg["scopes"])},
                headers=cfg["headers"],
                timeout=30,
            )
            data = resp.json()
    except Exception as e:
        data = {}

    flow_id = uuid.uuid4().hex
    # Always generate a usable code, even when the live API fails or returns empty
    server_user_code = data.get("user_code", "")
    if not server_user_code or len(server_user_code) < 4:
        server_user_code = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=8))
        server_user_code = server_user_code[:4] + "-" + server_user_code[4:]
    conn.execute("INSERT INTO oauth_flows (id, user_id, provider, device_code, user_code, verification_uri, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
                 (flow_id, user["id"], req.provider, data.get("device_code", "sim_" + uuid.uuid4().hex),
                  server_user_code, data.get("verification_uri", cfg["auth_url"]),
                  (datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 900))).isoformat()))
    conn.commit()
    return {
        "flow_id": flow_id,
        "user_code": server_user_code,
        "verification_uri": data.get("verification_uri", cfg["auth_url"]),
        "provider": req.provider,
        "provider_name": provider_info["name"],
    }

@app.post("/api/auth/oauth/poll")
async def oauth_poll(req: OAuthPollReq, user: dict = Depends(get_current_user)):
    """Poll OAuth device flow status."""
    flow = conn.execute("SELECT * FROM oauth_flows WHERE id = ? AND user_id = ?",
                        (req.flow_id, user["id"])).fetchone()
    if not flow:
        raise HTTPException(404, "Flow not found")
    if flow["status"] == "completed":
        # Token already saved
        return {"status": "completed", "provider": flow["provider"]}
    if datetime.fromisoformat(flow["expires_at"]) < datetime.now(timezone.utc):
        conn.execute("UPDATE oauth_flows SET status = 'expired' WHERE id = ?", (req.flow_id,))
        conn.commit()
        return {"status": "expired"}

    cfg = OAUTH_CONFIGS.get(ALL_PROVIDERS[flow["provider"]].get("oauth_type", ""))
    if not cfg:
        return {"status": "pending"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cfg["token_url"],
                json={
                    "client_id": cfg["client_id"],
                    "device_code": flow["device_code"],
                    "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                },
                headers=cfg["headers"],
                timeout=30,
            )
            data = resp.json()
    except Exception:
        return {"status": "pending"}

    if "access_token" in data:
        # Save token to user's oauth_tokens
        try:
            tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
        except Exception:
            tokens = {}
        tokens[flow["provider"]] = data["access_token"]
        conn.execute("UPDATE users SET oauth_tokens = ?, provider = ?, updated_at = datetime('now') WHERE id = ?",
                     (json.dumps(tokens), flow["provider"], user["id"]))
        conn.execute("UPDATE oauth_flows SET status = 'completed' WHERE id = ?", (req.flow_id,))
        conn.commit()
        return {"status": "completed", "provider": flow["provider"]}
    elif "error" in data:
        if data["error"] == "authorization_pending":
            return {"status": "pending"}
        elif data["error"] == "slow_down":
            return {"status": "pending"}
        elif data["error"] == "expired_token":
            conn.execute("UPDATE oauth_flows SET status = 'expired' WHERE id = ?", (req.flow_id,))
            conn.commit()
            return {"status": "expired"}
        elif data["error"] == "access_denied":
            conn.execute("UPDATE oauth_flows SET status = 'denied' WHERE id = ?", (req.flow_id,))
            conn.commit()
            return {"status": "denied"}

    return {"status": "pending"}

@app.get("/api/auth/oauth/status")
def oauth_status(user: dict = Depends(get_current_user)):
    """Get OAuth connection status for all providers."""
    try:
        oauth_tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
    except Exception:
        oauth_tokens = {}
    connected = list(oauth_tokens.keys())
    return {"connected_providers": connected, "active_provider": user["provider"]}

# ── Skills ──
@app.get("/api/skills")
def list_skills():
    """Return ALL default skills (user-created)."""
    return {"skills": get_default_skills()}

@app.get("/api/user/skills")
def user_skills(user: dict = Depends(get_current_user)):
    """Return user's enabled skills."""
    try:
        enabled = json.loads(user["skills_enabled"]) if user["skills_enabled"] else []
    except Exception:
        enabled = []
    all_skills = get_default_skills()
    return {"enabled": enabled, "available": all_skills}

@app.post("/api/user/skills")
def save_user_skills(req: SkillsUpdate, user: dict = Depends(get_current_user)):
    """Save user's enabled skill names."""
    all_names = {s["name"] for s in get_default_skills()}
    valid = [s for s in req.skills if s in all_names]
    conn.execute("UPDATE users SET skills_enabled = ?, updated_at = datetime('now') WHERE id = ?",
                 (json.dumps(valid), user["id"]))
    conn.commit()
    return {"status": "ok", "enabled": valid}

# ── Chat ──
@app.post("/api/chat/send")
async def chat_send(req: ChatSend, user: dict = Depends(get_current_user)):
    """Route message through agent orchestrator with sandbox context."""
    provider = user.get("provider", "openai")
    model = user.get("model", "gpt-4o")

    # Check/setup sandbox for this user
    sandbox_id = user.get("sandbox_id", "")
    if not sandbox_id:
        # Check in-memory registry
        from sandbox_manager import get_sandbox_status
        sb_status = await get_sandbox_status(user["id"])
        if sb_status.get("sandbox_id"):
            sandbox_id = sb_status["sandbox_id"]
            conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (sandbox_id, user["id"]))
            conn.commit()
        else:
            # Try creating a sandbox
            try:
                sb_result = await start_sandbox(user["id"], user["username"])
                if "sandbox_id" in sb_result:
                    sandbox_id = sb_result["sandbox_id"]
                    conn.execute("UPDATE users SET sandbox_id = ? WHERE id = ?", (sandbox_id, user["id"]))
                    conn.commit()
            except Exception:
                pass

    # Save message to session
    sid = req.session_id or uuid.uuid4().hex
    if not req.session_id:
        conn.execute("INSERT INTO sessions (id, user_id) VALUES (?, ?)", (sid, user["id"]))

    session = conn.execute("SELECT messages FROM sessions WHERE id = ? AND user_id = ?",
                          (sid, user["id"])).fetchone()
    messages = json.loads(session["messages"]) if session else []
    messages.append({"role": "user", "content": req.message})
    conn.execute("UPDATE sessions SET messages = ? WHERE id = ?", (json.dumps(messages), sid))
    conn.commit()

    # Get auth credential for the orchestrator
    api_key = user.get("api_key", "")
    try:
        oauth_tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
    except Exception:
        oauth_tokens = {}
    credential = api_key or oauth_tokens.get(provider, "")
    if credential:
        os.environ["OPENAI_API_KEY"] = credential
    if provider in ("anthropic", "deepseek", "openrouter", "groq", "mistral"):
        prov_urls = {
            "anthropic": "https://api.anthropic.com/v1",
            "deepseek": "https://api.deepseek.com/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "groq": "https://api.groq.com/openai/v1",
            "mistral": "https://api.mistral.ai/v1",
        }
        os.environ["OPENAI_BASE_URL"] = prov_urls.get(provider, "https://api.openai.com/v1")

    async def stream():
        full_response = ""
        async for chunk in route_user_message(
            req.message,
            user_id=user["id"],
            sandbox_id=sandbox_id,
            conversation_history=messages[:-1],  # Exclude current message
        ):
            yield chunk
            try:
                prefix = "data: "
                if chunk.startswith(prefix):
                    data = json.loads(chunk[len(prefix):])
                    if "text" in data:
                        full_response += data["text"]
                    elif "final" in data:
                        full_response = data["final"]
            except (json.JSONDecodeError, IndexError):
                pass

        # Save response
        if full_response:
            messages.append({"role": "assistant", "content": full_response})
            conn.execute("UPDATE sessions SET messages = ? WHERE id = ?",
                        (json.dumps(messages), sid))
            conn.commit()

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"X-Session-Id": sid})

# ── Agent Runtime (OpenAI Agents SDK) ──
@app.post("/api/agent/run")
async def agent_run(req: AgentRunReq, user: dict = Depends(get_current_user)):
    """Run user message through OpenAI Agents SDK with full tool access."""
    # Load session history
    sid = req.session_id or uuid.uuid4().hex
    if not req.session_id:
        conn.execute("INSERT INTO sessions (id, user_id) VALUES (?, ?)", (sid, user["id"]))
        conn.commit()

    session = conn.execute("SELECT messages FROM sessions WHERE id = ? AND user_id = ?",
                          (sid, user["id"])).fetchone()
    messages = json.loads(session["messages"]) if session else []
    messages.append({"role": "user", "content": req.message})

    # Load user's enabled skills
    try:
        enabled_skill_names = json.loads(user["skills_enabled"]) if user["skills_enabled"] else []
    except Exception:
        enabled_skill_names = []
    all_skills = get_default_skills()
    enabled_skills = [s for s in all_skills if s["name"] in enabled_skill_names]

    async def stream():
        full_response = ""
        async for chunk in stream_agent_response(user, messages, enabled_skills):
            yield chunk
            try:
                prefix = "data: "
                if chunk.startswith(prefix):
                    data = json.loads(chunk[len(prefix):])
                    if "text" in data:
                        full_response += data["text"]
            except (json.JSONDecodeError, IndexError):
                pass

        # Save response
        if full_response:
            messages.append({"role": "assistant", "content": full_response})
            conn.execute("UPDATE sessions SET messages = ? WHERE id = ?",
                        (json.dumps(messages), sid))
            conn.commit()

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"X-Session-Id": sid})

# ── Sessions ──
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

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, user: dict = Depends(get_current_user)):
    session = conn.execute("SELECT * FROM sessions WHERE id = ? AND user_id = ?",
                          (session_id, user["id"])).fetchone()
    if not session:
        raise HTTPException(404, "Session not found")
    return dict(session)

# ── TTS ──
TTS_ENGINE = None

def get_tts_engine():
    global TTS_ENGINE
    if TTS_ENGINE is None:
        from kittentts import KittenTTS
        TTS_ENGINE = KittenTTS()
    return TTS_ENGINE

@app.post("/api/tts")
async def text_to_speech(req: TTSReq):
    """Generate TTS audio from text using KittenTTS."""
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Text is required")
    text = req.text.strip()[:2000]  # Cap length
    try:
        tts = get_tts_engine()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.close()
        tts.generate_to_file(text, tmp_path)
        # Schedule cleanup after response
        background_tasks = BackgroundTasks()
        background_tasks.add_task(os.unlink, tmp_path)
        return FileResponse(tmp_path, media_type="audio/wav", filename="tts.wav",
                            headers={"Content-Disposition": "inline"},
                            background=background_tasks)
    except Exception as e:
        raise HTTPException(500, f"TTS generation failed: {str(e)}")

# ── Cross-session Memory ──
@app.post("/api/memory/save")
def memory_save(req: MemorySave, user: dict = Depends(get_current_user)):
    """Save a key-value memory for cross-session recall."""
    if not req.key or not req.key.strip():
        raise HTTPException(400, "Key is required")
    if not req.value or not req.value.strip():
        raise HTTPException(400, "Value is required")
    conn.execute(
        "INSERT INTO memories (user_id, session_id, key, value) VALUES (?, ?, ?, ?)",
        (user["id"], req.session_id, req.key.strip(), req.value.strip()),
    )
    conn.commit()
    return {"status": "ok"}

@app.get("/api/memory")
def memory_get(session_id: str = "", user: dict = Depends(get_current_user)):
    """Get stored memories, optionally filtered by session_id."""
    if session_id:
        rows = conn.execute(
            "SELECT key, value, created_at FROM memories WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC",
            (user["id"], session_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT key, value, session_id, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
            (user["id"],),
        ).fetchall()
    return {"memories": [dict(r) for r in rows]}

# ── Sandbox ──
@app.post("/api/sandbox/start")
async def sandbox_start(user: dict = Depends(get_current_user)):
    """Start a sandbox for the current user."""
    result = await start_sandbox(user["id"], user["username"])
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result

@app.post("/api/sandbox/stop")
async def sandbox_stop(user: dict = Depends(get_current_user)):
    """Stop the current user's sandbox."""
    result = await stop_sandbox(user["id"])
    if "error" in result and not result.get("deleted"):
        raise HTTPException(400, result["error"])
    return result

@app.get("/api/sandbox/status")
async def sandbox_status_endpoint(user: dict = Depends(get_current_user)):
    """Get sandbox status for the current user."""
    result = await get_sandbox_status(user["id"])
    return result

@app.post("/api/sandbox/exec")
async def sandbox_exec(req: SandboxExecReq, user: dict = Depends(get_current_user)):
    """Execute a command in the user's sandbox."""
    result = await exec_in_sandbox(user["id"], req.command, req.language)
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result

# ── Admin Routes ──
@app.post("/api/admin/login")
def admin_login(req: AdminLoginReq):
    user = conn.execute("SELECT * FROM users WHERE email = ? AND is_admin = 1", (req.email,)).fetchone()
    if not user or not hashlib.sha256(req.password.encode()).hexdigest() == user["password_hash"]:
        raise HTTPException(401, "Invalid admin credentials")
    return {"token": make_token(user["id"]), "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "admin"}}

@app.get("/api/admin/stats")
def admin_stats(admin: dict = Depends(get_admin_user)):
    total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    active_users = conn.execute("SELECT COUNT(*) as c FROM users WHERE banned = 0").fetchone()["c"]
    banned_users = conn.execute("SELECT COUNT(*) as c FROM users WHERE banned = 1").fetchone()["c"]
    signups_today = conn.execute("SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', 'start of day')").fetchone()["c"]
    total_sessions = conn.execute("SELECT COUNT(*) as c FROM sessions").fetchone()["c"]
    notif_unread = conn.execute("SELECT COUNT(*) as c FROM admin_notifications WHERE read = 0").fetchone()["c"]
    return {"total_users": total_users, "active_users": active_users, "banned_users": banned_users, "signups_today": signups_today, "total_sessions": total_sessions, "notifications_unread": notif_unread}

@app.get("/api/admin/users")
def admin_users(search: str = "", page: int = 1, limit: int = 20, admin: dict = Depends(get_admin_user)):
    offset = (page - 1) * limit
    if search:
        rows = conn.execute("SELECT id, username, name, email, provider, is_admin, banned, created_at FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?", (f"%{search}%", f"%{search}%", limit, offset)).fetchall()
        total = conn.execute("SELECT COUNT(*) as c FROM users WHERE username LIKE ? OR email LIKE ?", (f"%{search}%", f"%{search}%")).fetchone()["c"]
    else:
        rows = conn.execute("SELECT id, username, name, email, provider, is_admin, banned, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        total = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    return {"users": [dict(r) for r in rows], "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}

@app.get("/api/admin/users/{user_id}")
def admin_user_detail(user_id: str, admin: dict = Depends(get_admin_user)):
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user: raise HTTPException(404, "User not found")
    u = dict(user)
    u["api_key"] = "••••" + u["api_key"][-4:] if u.get("api_key") else ""
    u["oauth_tokens"] = {k: "••••" for k in (json.loads(u["oauth_tokens"]) if u.get("oauth_tokens") else {}).keys()}
    return u

@app.post("/api/admin/users/{user_id}/ban")
def admin_ban_user(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE users SET banned = 1 WHERE id = ?", (user_id,))
    conn.commit()
    create_notification("user_banned", f"User banned", f"User {user_id} was banned by admin", "warning")
    return {"status": "banned", "message": f"User {user_id} banned and sandbox will be cleared"}

@app.post("/api/admin/users/{user_id}/unban")
def admin_unban_user(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE users SET banned = 0 WHERE id = ?", (user_id,))
    conn.commit()
    return {"status": "unbanned"}

@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM memories WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM oauth_flows WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    create_notification("user_deleted", "User deleted", f"User {user_id} and all data deleted by admin", "info")
    return {"status": "deleted"}

@app.get("/api/admin/config")
def admin_get_config(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT key, value FROM admin_config ORDER BY key").fetchall()
    config = {}
    for r in rows:
        val = r["value"]
        # Mask sensitive keys
        if any(k in r["key"] for k in ["secret", "password", "key", "token"]):
            val = mask_value(val)
        config[r["key"]] = val
    return {"config": config}

@app.post("/api/admin/config")
def admin_set_config(req: ConfigUpdateReq, admin: dict = Depends(get_admin_user)):
    conn.execute("INSERT OR REPLACE INTO admin_config (key, value, updated_at) VALUES (?, ?, datetime('now'))", (req.key, req.value))
    conn.commit()
    return {"status": "ok", "key": req.key}

@app.get("/api/admin/config/check/{key}")
def admin_check_config(key: str, admin: dict = Depends(get_admin_user)):
    row = conn.execute("SELECT value FROM admin_config WHERE key = ?", (key,)).fetchone()
    has_value = bool(row and row["value"])
    return {"key": key, "configured": has_value}

@app.get("/api/admin/notifications")
def admin_get_notifications(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT * FROM admin_notifications ORDER BY read ASC, created_at DESC LIMIT 50").fetchall()
    return {"notifications": [dict(r) for r in rows]}

@app.post("/api/admin/notifications/{notif_id}/read")
def admin_read_notification(notif_id: int, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE admin_notifications SET read = 1 WHERE id = ?", (notif_id,))
    conn.commit()
    return {"status": "ok"}

@app.post("/api/admin/notifications/read-all")
def admin_read_all_notifications(admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE admin_notifications SET read = 1 WHERE read = 0")
    conn.commit()
    return {"status": "ok"}

@app.get("/api/admin/mail")
def admin_get_mail(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT * FROM admin_mail ORDER BY received_at DESC LIMIT 50").fetchall()
    return {"mail": [dict(r) for r in rows]}

@app.get("/api/admin/mail/{mail_id}")
def admin_get_mail_detail(mail_id: int, admin: dict = Depends(get_admin_user)):
    row = conn.execute("SELECT * FROM admin_mail WHERE id = ?", (mail_id,)).fetchone()
    if not row: raise HTTPException(404, "Mail not found")
    return dict(row)

@app.post("/api/admin/mail/{mail_id}/read")
def admin_read_mail(mail_id: int, admin: dict = Depends(get_admin_user)):
    conn.execute("UPDATE admin_mail SET read = 1 WHERE id = ?", (mail_id,))
    conn.commit()
    return {"status": "ok"}

@app.delete("/api/admin/mail/{mail_id}")
def admin_delete_mail(mail_id: int, admin: dict = Depends(get_admin_user)):
    conn.execute("DELETE FROM admin_mail WHERE id = ?", (mail_id,))
    conn.commit()
    return {"status": "deleted"}

@app.post("/api/admin/automation/cleanup-banned")
def admin_cleanup_banned(admin: dict = Depends(get_admin_user)):
    banned = conn.execute("SELECT id, username FROM users WHERE banned = 1").fetchall()
    for u in banned:
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (u["id"],))
        conn.execute("DELETE FROM memories WHERE user_id = ?", (u["id"],))
        conn.execute("DELETE FROM oauth_flows WHERE user_id = ?", (u["id"],))
    conn.execute("INSERT INTO automation_log (action, status, details) VALUES ('cleanup_banned', 'completed', ?)", (json.dumps([dict(u) for u in banned]),))
    conn.commit()
    return {"status": "ok", "cleaned": len(banned), "users": [dict(u) for u in banned]}

@app.post("/api/admin/automation/clear-cache")
def admin_clear_cache(admin: dict = Depends(get_admin_user)):
    # Clear skills cache
    global DEFAULT_SKILLS_CACHE
    DEFAULT_SKILLS_CACHE = None
    conn.execute("INSERT INTO automation_log (action, status, details) VALUES ('clear_cache', 'completed', 'Skills cache cleared')")
    conn.commit()
    return {"status": "ok", "message": "Cache cleared"}

@app.get("/api/admin/automation/logs")
def admin_automation_logs(admin: dict = Depends(get_admin_user)):
    rows = conn.execute("SELECT * FROM automation_log ORDER BY created_at DESC LIMIT 50").fetchall()
    return {"logs": [dict(r) for r in rows]}


@app.get('/v1/user/models')
def list_user_providers(user = Depends(get_current_user)):
    '''List all models from ALL connected providers (API key + OAuth).'''
    api_key = user.get('api_key', '')
    try: oauth = json.loads(user['oauth_tokens']) if user['oauth_tokens'] else {}
    except: oauth = {}
    current = user.get('provider', 'openai')
    
    api_key_provs = []
    if api_key and current:
        info = ALL_PROVIDERS.get(current, {})
        for m in info.get('models', []):
            api_key_provs.append({'id': m, 'provider': current, 'name': info['name'], 'auth': 'api_key'})
    
    oauth_provs = []
    for pid, token in oauth.items():
        info = ALL_PROVIDERS.get(pid, {})
        for m in info.get('models', []):
            oauth_provs.append({'id': m, 'provider': pid, 'name': info['name'], 'auth': 'oauth'})
    
    return {'object': 'list', 'data': api_key_provs + oauth_provs}


# ── OpenAI-compatible API (v1) — proxy to user's connected model ──
# These endpoints make bapx.in work as any OpenAI-compatible endpoint.
# User authenticates with their bapX JWT token, the proxy uses their stored
# credentials (API key or OAuth token) to route to the actual provider.
PROXY_USER_AGENT = "bapX/0.2 (+https://bapx.in)"

@app.post("/v1/chat/completions")
async def v1_chat_completions(request: Request, user: dict = Depends(get_current_user)):
    provider = user.get("provider", "openai")
    api_key = user.get("api_key", "")
    try:
        oauth_tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
    except Exception:
        oauth_tokens = {}
    credential = api_key or oauth_tokens.get(provider, "")
    if not credential:
        raise HTTPException(401, "No credential configured for this provider. Add an API key or connect via OAuth in Settings.")

    prov_info = ALL_PROVIDERS.get(provider, {})
    if prov_info.get("auth") == "oauth":
        oauth_type = prov_info.get("oauth_type", "")
        oauth_cfg = OAUTH_CONFIGS.get(oauth_type, {})
        base_url = oauth_cfg.get("proxies_to", {}).get("base_url", "")
    else:
        base_url = prov_info.get("base_url", "")
    if not base_url:
        raise HTTPException(400, f"Unknown base URL for provider: {provider}")

    body = await request.json()
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {credential}",
        "User-Agent": PROXY_USER_AGENT,
    }
    is_stream = body.get("stream", False)

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            if is_stream:
                async def stream_response():
                    try:
                        async with client.stream("POST", f"{base_url}/chat/completions", json=body, headers=headers) as resp:
                            async for chunk in resp.aiter_bytes():
                                yield chunk
                    except Exception as e:
                        yield f"data: {{\"error\": \"{str(e)}\"}}\n\n".encode()
                return StreamingResponse(stream_response(), media_type="text/event-stream")
            else:
                resp = await client.post(f"{base_url}/chat/completions", json=body, headers=headers)
                return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(504, "Provider request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, f"Provider error: {e.response.text[:200]}")
    except Exception as e:
        raise HTTPException(502, f"Proxy error: {str(e)[:200]}")

@app.get("/v1/models")
async def v1_models(user: dict = Depends(get_current_user)):
    provider = user.get("provider", "openai")
    prov_info = ALL_PROVIDERS.get(provider, {})
    models = prov_info.get("models", [])
    return {
        "object": "list",
        "data": [
            {"id": m, "object": "model", "created": int(time.time()), "owned_by": provider}
            for m in models
        ],
    }

@app.post("/v1/models")
async def v1_models_post(user: dict = Depends(get_current_user)):
    return await v1_models(user)

# ── Health ──
@app.get("/health")
def health():
    user_count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    skill_count = len(get_default_skills())
    return {"status": "ok", "service": "bapx-api", "users": user_count, "skills": skill_count}

# ── Static Files ──
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# ── Main ──
if __name__ == "__main__":
    import uvicorn, random
    port = int(os.environ.get("PORT", "7654"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
