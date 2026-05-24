# bapX — Browser-Based AI Agent Platform

## Project Objective
Build **bapX** (bapx.in) — a browser-only AI agent platform where users authenticate with their own model accounts (ChatGPT, Claude, API keys, etc.) and get an OpenAI-compatible endpoint that routes to their connected models. Users also get a sandboxed Codex CLI agent, persistent memory, and a library of default skills from Hermes.

## Stack
- **Backend**: Python FastAPI on port 7654 (`main:app`)
- **Frontend**: Pure HTML/CSS/JS in `static/` (no React, no TypeScript)
- **Agent Runtime**: Codex CLI (`/usr/local/bin/bapXcodex`) inside per-user OpenSandbox containers
- **Sandbox**: OpenSandbox Docker (per-user)
- **Auth**: bapX JWT tokens, API keys, OAuth device flow
- **Database**: SQLite at `data/bapx.db`
- **Git**: `origin https://github.com/getwinharris/bapX-agent.git` — only `main` branch
- **All code in**: `/root/Dev/bapx/`

## Code Conventions
- Python: FastAPI patterns, async endpoints, `Depends(get_current_user)` for auth
- Frontend: Vanilla JS, no frameworks, CSS custom properties
- All routes in `backend.py` (single-file backend, ~1100 lines)
- Skills loaded from `data/skills/` + `/usr/local/lib/hermes-agent/skills/`
- When you add a new model provider, add to `ALL_PROVIDERS` dict + `OAUTH_CONFIGS` if OAuth

## Current State (May 2026)

### What's Built
- **Backend**: FastAPI on port 7654 with 50+ API endpoints
- **Auth**: Email/password signup, JWT tokens, OAuth device flow
- **Providers**: 18 API key providers + 5 OAuth providers (ChatGPT, Claude, Google, Nous, Qwen) + 1 Copilot
- **Proxy**: `/v1/chat/completions` — OpenAI-compatible endpoint that routes to user's connected model
- **Models**: `/v1/models` and `/v1/user/models` endpoints
- **Skills**: 89 default skills loaded from Hermes + user-created
- **Chat**: Streaming chat via agent orchestrator + sandbox
- **Sandbox**: Per-user OpenSandbox Docker containers
- **Mobile**: Responsive sidebar (48px icon rail, expands on tap)
- **Admin**: User management, config, notifications, logs
- **TTS**: Text-to-speech via KittenTTS
- **Memory**: Cross-session key-value memory

### Current Backend Files
- `backend.py` — Main FastAPI app (ALL routes in one file)
- `agent_orchestrator.py` — Message routing to Codex/Sandbox
- `agent_runtime.py` — OpenAI Agents SDK integration
- `sandbox_manager.py` — Sandbox lifecycle management

### Current Frontend Files (in static/)
- `dashboard.html` — Main SPA (all HTML + CSS + JS in one file, ~1150 lines)
- `index.html` — Landing page
- `admin.html` — Admin panel

## Key Architecture Rules
1. **Never mention Hermes** to users — this is bapX, standalone product
2. **bapx.in is the gateway** — users login with ChatGPT/Claude etc., their models appear in the platform
3. **`/v1/chat/completions`** proxies to whatever provider+model the user selected using their stored credential
4. **OAuth users** authenticate via device code flow, tokens stored in `oauth_tokens` JSON column
5. **Skills** are only loaded — users enable/disable them, no editing from the UI
6. **Codex CLI** is CTO tool (`/root/.hermes/node/bin/codex` with `CODEX_API_KEY=hermes-codex-bridge`)
7. **bapXcodex** is platform agent runtime at `/usr/local/bin/bapXcodex`

## Current Users
- 10 users in database, 102 skills loaded, running on port 7654 via uvicon

## What Codex Should Do
When given a task:
1. Read the current files to understand current state
2. Make targeted, minimal changes
3. Run lint checks on Python files after changing them
4. Verify the backend starts: `pkill -f 'uvicorn main:app'; sleep 1; python3 -m uvicorn main:app --host 0.0.0.0 --port 7654 &` then `curl http://127.0.0.1:7654/health`
5. Test new endpoints after creating them
6. Never move files or restructure the project
