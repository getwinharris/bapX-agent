# bapX

Browser-only AI agent platform. Python FastAPI backend. Pure HTML/CSS/JS frontend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI (uvicorn, port 7654) |
| Frontend | Pure HTML, CSS, JavaScript (no React, no Node, no TypeScript) |
| Agent Runtime | Codex CLI inside per-user OpenSandbox container |
| Orchestration | OpenAI Agents SDK (Python) |
| Sandbox | OpenSandbox per user (not Docker CLI) |
| Auth | API keys + OAuth device flow (ChatGPT, Claude, Grok, Gemini, Nous, Qwen, Copilot) |
| Skills | All default Hermes skills built-in |
| Pricing | Storage-based, no free plan, compute free |
| Domain | bapx.in, agent.bapx.in |

## Getting Started

```bash
# Install deps
pip install -r requirements.txt

# Set JWT secret
export BAPX_JWT_SECRET="your-32-char-min-secret"

# Run
python backend.py
```

## Architecture

```
bapx.in ── Caddy reverse proxy ──► FastAPI :7654
                                        ├── /api/* — REST endpoints
                                        ├── /api/chat/send — SSE streaming
                                        └── /static/* — dashboard.html + assets

agent.bapx.in ── Caddy ──► FastAPI /api/agent/*
```

### Auth Methods for Model Connection

Users connect AI models via:

1. **API Key** — 20+ providers (OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Grok, etc.)
2. **OAuth Login** — Device flow auth for:
   - ChatGPT (OpenAI plan)
   - Claude (Anthropic plan)  
   - Grok (xAI plan)
   - Gemini (Google plan)
   - Nous Portal
   - Qwen (Alibaba)
   - GitHub Copilot

### Skills

All default skills are available out of the box — software development, creative tools, code review, devops, research, gaming, media, productivity, ML/AI, data science, and more.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/signup | Create account |
| POST   | /api/login | Sign in |
| GET    | /api/providers | List all model providers |
| GET    | /api/skills | List all default skills |
| GET    | /api/user/profile | Get user profile |
| PUT    | /api/user/profile | Update profile |
| PUT    | /api/user/api-key | Save API key |
| POST   | /api/auth/oauth/start | Start OAuth device flow |
| POST   | /api/auth/oauth/poll | Poll OAuth status |
| GET    | /api/auth/oauth/status | OAuth connection status |
| GET    | /api/user/skills | Get user's enabled skills |
| POST   | /api/user/skills | Save enabled skills |
| POST   | /api/chat/send | Send chat message (SSE) |
| GET    | /api/sessions | List chat sessions |
| GET    | /api/sessions/:id | Get session |
| DELETE | /api/sessions/:id | Delete session |
| GET    | /health | Health check |
