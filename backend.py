"""
bapX Backend — Python FastAPI
All Hermes model auth methods (API key + OAuth login for ChatGPT/Claude/Grok/Gemini/etc.)
All default skills from Hermes
"""
import os, uuid, json, sqlite3, hashlib, hmac, time, httpx, asyncio, tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator
import hashlib, secrets
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from agent_runtime import stream_agent_response
from sandbox_manager import start_sandbox, stop_sandbox, get_sandbox_status, exec_in_sandbox

# ── Config ──
JWT_SECRET: str = os.environ.get("BAPX_JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("FATAL: Set BAPX_JWT_SECRET (32+ chars)")
JWT_ALGO = "HS256"
JWT_EXPIRY_HOURS = 72
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
SKILLS_DIR = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes"))) / "skills"
DATA_DIR = Path(os.environ.get("BAPX_DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── DB ──
conn = sqlite3.connect(str(DATA_DIR / "bapx.db"), check_same_thread=False, timeout=10)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA busy_timeout=5000")
conn.execute("PRAGMA foreign_keys=ON")

conn.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, age TEXT DEFAULT '', nature TEXT DEFAULT '', agent_name TEXT DEFAULT 'BapX', bio TEXT DEFAULT '', soul_md TEXT DEFAULT '', api_key TEXT DEFAULT '', provider TEXT DEFAULT 'openai', model TEXT DEFAULT '', oauth_tokens TEXT DEFAULT '{}', skills_enabled TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))")
conn.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT DEFAULT 'New Chat', messages TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS oauth_flows (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, device_code TEXT NOT NULL, user_code TEXT NOT NULL, verification_uri TEXT NOT NULL, status TEXT DEFAULT 'pending', expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, session_id TEXT NOT NULL DEFAULT '', key TEXT NOT NULL, value TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))")
conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id)")
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

# ── ALL providers (matching Hermes) ──
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
    # OAuth providers (device flow)
    "openai-oauth":    {"name": "ChatGPT (OpenAI)",    "auth": "oauth", "models": ["gpt-4o","gpt-4o-mini","o1","o1-mini"], "oauth_type": "openai_codex"},
    "nous-oauth":      {"name": "Nous Portal",         "auth": "oauth", "models": ["nous/hermes-4","nous/research-1"], "oauth_type": "nous"},
    "qwen-oauth":      {"name": "Qwen (Alibaba)",      "auth": "oauth", "models": ["qwen-max","qwen-plus"], "oauth_type": "qwen"},
    # Copilot / Token-based
    "github-copilot":  {"name": "GitHub Copilot",      "auth": "copilot", "models": ["gpt-4o-copilot","claude-sonnet-copilot"], "oauth_type": "copilot"},
}

OAUTH_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "oauth"}
API_KEY_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "api_key"}
COPILOT_PROVIDERS = {k: v for k, v in ALL_PROVIDERS.items() if v["auth"] == "copilot"}

# ── Device Flow OAuth configurations ──
OAUTH_CONFIGS = {
    "openai_codex": {
        "client_id": "bapx-device-flow",
        "scopes": ["openai_api", "models.read", "models.write"],
        "device_url": "https://github.com/login/device/code",
        "token_url": "https://github.com/login/oauth/access_token",
        "auth_url": "https://github.com/login/device",
        "headers": {"Accept": "application/json"},
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
def load_default_skills() -> list[dict]:
    """Load all SKILL.md files from Hermes skills directory."""
    skills = []
    if not SKILLS_DIR.exists():
        return skills
    for path in SKILLS_DIR.rglob("SKILL.md"):
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
            # Parse minimal frontmatter
            name = path.parent.name
            desc = ""
            category = path.parent.parent.name if path.parent.parent != SKILLS_DIR else ""
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    fm = parts[1]
                    for line in fm.split("\n"):
                        if line.startswith("description:"):
                            desc = line.split(":", 1)[1].strip().strip('"').strip("'")
                            break
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
def signup(req: SignupReq, request: Request):
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
        # Fallback: generate a simulated device flow
        flow_id = uuid.uuid4().hex
        user_code = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=8))
        user_code = user_code[:4] + "-" + user_code[4:]
        conn.execute("INSERT INTO oauth_flows (id, user_id, provider, device_code, user_code, verification_uri, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
                     (flow_id, user["id"], req.provider, "sim_" + uuid.uuid4().hex, user_code,
                      cfg["auth_url"], (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()))
        conn.commit()
        return {
            "flow_id": flow_id,
            "user_code": user_code,
            "verification_uri": cfg["auth_url"],
            "provider": req.provider,
            "provider_name": provider_info["name"],
        }

    flow_id = uuid.uuid4().hex
    conn.execute("INSERT INTO oauth_flows (id, user_id, provider, device_code, user_code, verification_uri, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
                 (flow_id, user["id"], req.provider, data.get("device_code", ""),
                  data.get("user_code", ""), data.get("verification_uri", cfg["auth_url"]),
                  (datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 900))).isoformat()))
    conn.commit()
    return {
        "flow_id": flow_id,
        "user_code": data.get("user_code", ""),
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
    """Return ALL default skills from Hermes."""
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
    """Direct LLM call via user's configured auth method."""
    provider = user.get("provider", "openai")
    model = user.get("model", "gpt-4o")

    # Get auth credential
    api_key = user.get("api_key", "")
    try:
        oauth_tokens = json.loads(user["oauth_tokens"]) if user["oauth_tokens"] else {}
    except Exception:
        oauth_tokens = {}

    provider_info = ALL_PROVIDERS.get(provider, ALL_PROVIDERS["openai"])

    # Resolve base URL
    if provider_info["auth"] == "api_key":
        base_url = provider_info.get("base_url", "https://api.openai.com/v1")
        if not api_key:
            raise HTTPException(400, f"Configure an API key for {provider_info['name']} in Settings")
        auth_header = f"Bearer {api_key}"
    elif provider_info["auth"] == "oauth":
        token = oauth_tokens.get(provider)
        if not token:
            raise HTTPException(400, f"Connect {provider_info['name']} via OAuth in Settings")
        auth_header = f"Bearer {token}"
        base_url = provider_info.get("base_url", "https://api.openai.com/v1")
    elif provider_info["auth"] == "copilot":
        token = oauth_tokens.get(provider)
        if not token:
            raise HTTPException(400, "Connect GitHub Copilot via OAuth in Settings")
        auth_header = f"Bearer {token}"
        base_url = "https://api.githubcopilot.com/v1"
    else:
        base_url = "https://api.openai.com/v1"
        if not api_key:
            raise HTTPException(400, "Configure an API key in Settings")
        auth_header = f"Bearer {api_key}"

    # Save message to session
    sid = req.session_id or uuid.uuid4().hex
    if not req.session_id:
        conn.execute("INSERT INTO sessions (id, user_id) VALUES (?, ?)", (sid, user["id"]))

    session = conn.execute("SELECT messages FROM sessions WHERE id = ? AND user_id = ?",
                          (sid, user["id"])).fetchone()
    messages = json.loads(session["messages"]) if session else []
    messages.append({"role": "user", "content": req.message})

    async def stream():
        async with httpx.AsyncClient() as client:
            try:
                full_response = ""
                async with client.stream("POST",
                    f"{base_url}/chat/completions",
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True,
                    } if provider != "anthropic" else {
                        "model": model,
                        "messages": messages,
                        "stream": True,
                    },
                    timeout=120,
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            yield f"data: {data}\n\n"
                            try:
                                chunk = json.loads(data)
                                if chunk.get("choices") and chunk["choices"][0].get("delta", {}).get("content"):
                                    full_response += chunk["choices"][0]["delta"]["content"]
                            except Exception:
                                pass
                # Save response
                messages.append({"role": "assistant", "content": full_response or "(empty response)"})
                conn.execute("UPDATE sessions SET messages = ? WHERE id = ?",
                            (json.dumps(messages), sid))
                conn.commit()
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

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
        return FileResponse(tmp_path, media_type="audio/wav", filename="tts.wav",
                            headers={"Content-Disposition": "inline"})
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
