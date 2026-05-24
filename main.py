"""bapx.in API — auth for landing page signup/login"""
import os, uuid, json, sqlite3
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.hash import bcrypt
from datetime import datetime, timezone, timedelta
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

def _rate_key(request: Request) -> str:
    """Use X-Forwarded-For for real client IP behind Fastify proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"

app = FastAPI(title="bapX")
# Rate limiting — defense-in-depth behind Fastify proxy
limiter = Limiter(key_func=_rate_key)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Determine allowed origins for CORS
CORS_ORIGINS = os.environ.get("BAPX_CORS_ORIGINS", "https://bapx.in,https://app.bapx.in,http://localhost:5173").split(",")

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

JWT_SECRET: str = os.environ.get("BAPX_JWT_SECRET", "")
if not JWT_SECRET:
    raise RuntimeError("FATAL: BAPX_JWT_SECRET environment variable is required. Set it to a strong random value.")
if len(JWT_SECRET) < 32:
    raise RuntimeError("FATAL: BAPX_JWT_SECRET must be at least 32 characters for security.")
JWT_ALGO = "HS256"
JWT_EXPIRY_HOURS = 72

# SQLite persistence
DB_DIR = Path(os.environ.get("BAPX_DATA_DIR", "/root/Dev/bapx/data"))
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "landing.db"

conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
conn.row_factory = sqlite3.Row
conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
""")
conn.commit()


def make_token(email: str) -> str:
    return jwt.encode({
        "sub": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }, JWT_SECRET, algorithm=JWT_ALGO)


class SignupReq(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginReq(BaseModel):
    email: str
    password: str


@app.post("/api/signup")
@limiter.limit("10/minute")
def signup(req: SignupReq, request: Request):
    if not req.password or len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(400, "Invalid email format")

    existing = conn.execute("SELECT email FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        raise HTTPException(409, "Email already registered")

    conn.execute(
        "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
        (req.email, bcrypt.hash(req.password), req.name or req.email.split("@")[0])
    )
    conn.commit()

    return {
        "status": "ok",
        "token": make_token(req.email),
        "email": req.email,
        "name": req.name or req.email.split("@")[0],
        "message": "Account created"
    }


@app.post("/api/login")
@limiter.limit("20/minute")
def login(req: LoginReq, request: Request):
    row = conn.execute("SELECT password_hash, name FROM users WHERE email = ?", (req.email,)).fetchone()
    if not row or not bcrypt.verify(req.password, row["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return {
        "status": "ok",
        "token": make_token(req.email),
        "email": req.email,
        "name": row["name"]
    }


@app.get("/health")
def health():
    count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    return {"status": "ok", "service": "bapx-api", "users": count}
