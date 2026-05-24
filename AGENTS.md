# bapX — From Codex Fork to Production Platform

## What This Project Is
bapX is a **forked and heavily modified Codex** (OpenAI's open-source agent runtime). We're converting it from a CLI tool into a full browser-based AI agent platform with sandboxed execution, OAuth provider integration, persistent memory, cron scheduling, and a complete tool ecosystem.

## CI/CD — Live VPS, No Staging
This entire project is built **live on this VPS**. There's no local dev environment, no staging, no deploy pipeline. Every change I make touches production directly:

- **Code** edited in-place at `/root/Dev/bapx/`
- **Backend** restarted automatically via `--reload` when I change files
- **Caddy** proxies `bapx.in` and `agent.bapx.in` to the backend
- **Docker** runs sandbox containers + SearXNG on the same host
- **Git** (`main` branch only) — no branches, no PRs, no CI pipeline
- **Testing** is done via curl + browser on the live site itself

This means:
- Every edit is instantly live
- Always verify with `curl` + browser after changes
- Don't leave the backend in a broken state — it's the production API
- `pkill -f 'uvicorn backend:app'` then restart with `BAPX_JWT_SECRET` + `SEARXNG_URL` env vars

## Core Knowledge System (read these every session)

### 1. AGENTS.md (this file) — Auto-loaded
Project orientation: what we're building, architecture, rules, conventions.

### 2. Memory — Auto-injected into every system prompt
- **User profile**: Harris = CEO bapX. Wants things BUILT, not analyzed.
- **Memory notes**: bapX providers (30), skills (none on backend), 28 tools, SearXNG, sandbox isolation rules
- **CRITICAL RULES** (in memory):
  - ALL projects in `/root/Dev/bapx/` — NO `/root/` directly, NO system paths
  - bapX branding: NEVER mention "powered by Hermes" to users. bapX stands alone.
  - Golden rule: bapX is the product. Hermes is the build tool. After build, Hermes is removed.

### 3. Wiki (`read_file /root/Dev/bapx/wiki/index.md`) — Deep reference
When you need implementation details, architecture diagrams, or comparison of approaches:
- `/root/Dev/bapx/wiki/SCHEMA.md` — wiki conventions
- `/root/Dev/bapx/wiki/index.md` — all 11 pages cataloged
- `/root/Dev/bapx/wiki/log.md` — recent activity
- Key pages: `vps-knowledge-graph`, `hermes-agent-blueprint`, `codex-fork-native-capabilities`, `codex-memory-system`, `sandbox-isolation-architecture`, `bapx-tools-manifest`

## Architecture

### Stack
```
Caddy :443 → reverse_proxy → FastAPI :7654
  → OpenSandbox Server :8080 → Docker Engine → per-user sandbox containers
    → Inside each sandbox: bapX (Codex fork) + 28 tools + 5 system skills
SearXNG Docker :8888 ← backend proxies web search
Hermes Gateway :8642 ← build tool (will be removed)
```

### What Codex Was vs What bapX Is Now

| Aspect | Codex (original) | bapX (our fork) |
|--------|-----------------|-----------------|
| Interface | Terminal CLI + TUI | Browser SPA (3-column) |
| Auth | OpenAI API key | 30 providers, 7 OAuth (existing plans) |
| Sandbox | Local filesystem | Docker per user via OpenSandbox |
| Tools | Shell, file ops, web search | Same + 28 Python CLI tools |
| Skills | 5 system skills (compiled) | Same + user-installed from marketplace |
| Memory | SQLite memories table | SQLite + USER.md/MEMORY.md two-store |
| Search | Provider web search API | Self-hosted SearXNG |
| Deploy | None | Custom domains, 6 deploy targets |
| Billing | None | Stripe subscriptions |
| Users | Single user | Multi-tenant with sandbox isolation |
| Cron | None | Scheduled jobs (planned) |
| Curator | None | Skill lifecycle management (planned) |
| Browser | None (OpenUrlInBrowser event) | CDP-based in sandbox (planned) |

### Frontend Architecture
- **Landing page** (`static/index.html`) — served at `bapx.in`
- **Dashboard** (`static/dashboard.html`) — served at `agent.bapx.in`
- Pure HTML/CSS/JS — no frameworks
- 3-column layout: sidebar (48px rail) | chat | right panel (Flow/Browser/Terminal)
- Mobile: sidebar always minimized, expands on tap with backdrop

## Running Services (Live)
| Service | Port | Notes |
|---------|------|-------|
| Caddy | 80/443 | TLS termination, reverse proxy |
| FastAPI backend | 7654 | `uvicorn backend:app --reload` |
| OpenSandbox server | 8080 | Docker sandbox orchestration |
| SearXNG | 8888 | Self-hosted web search (Docker) |
| Hermes gateway | 8642 | Build tool (DO NOT reference in bapX) |
| Hermes web UI | 8648 | Build tool (DO NOT reference in bapX) |

## Key Files
| File | Purpose |
|------|---------|
| `backend.py` | FastAPI app (1410 lines, ALL routes) |
| `tools/manifest.json` | 28 tool definitions with deps |
| `tools/tool_*.py` | Python CLI tool scripts |
| `tools/provision.sh` | Sandbox bootstrap |
| `static/dashboard.html` | Main SPA |
| `static/dashboard.css` | Styles (~290 lines) |
| `static/dashboard.js` | Logic (~1100 lines) |
| `static/index.html` | Landing page |
| `wiki/` | Knowledge base (11 pages) |
| `bapX-src/` | Codex fork Rust source (reference only) |
| `data/bapx.db` | SQLite database |
| `Caddyfile` | Caddy reverse proxy config |

## Workflow Rules
1. **Read AGENTS.md first** (auto-loaded, you're reading it now)
2. **Read memory** (auto-injected, already in context)
3. **Read wiki/index.md** when you need implementation details
4. **Read wiki/log.md** (last 20 lines) to see what happened last session
5. **Make changes** — edit, test with curl, verify with browser
6. **After complex tasks** — update wiki + memory + AGENTS.md
7. **Never leave backend broken** — this is production
8. **Never mention Hermes** in bapX code, UI, or user-facing content
9. **Never edit `bapX-src/`** — that's the forked Codex Rust source
10. **All projects in `/root/Dev/bapx/`** — no system paths, no `/root/` directly
