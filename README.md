# bapX

Browser-only AI agent platform at bapx.in.

## Stack

| Layer | Tool | What it does |
|-------|------|-------------|
| Backend | Python FastAPI (uvicorn, port 7654) | All API endpoints — auth, providers, chat, skills, memory, sandbox, admin |
| Frontend | Pure HTML, CSS, JavaScript | No frameworks. Single SPA at `/dashboard.html` |
| Orchestration | OpenAI Agents SDK | Creates agent per user with web search + tool execution, streams SSE responses |
| Sandbox | OpenSandbox SDK | Per-user isolated container (not Docker CLI) |
| TTS | KittenTTS | Voice responses in dashboard |
| Proxy | Caddy | Serves bapx.in, proxies `/api/*` to backend |
| Database | SQLite | Users, sessions, skills, memory, OAuth tokens, admin data |

## Model Connections (from Hermes internally)

1. **API Key** — 17 providers (OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter, xAI Grok, Groq, Mistral, Together AI, Cohere, Perplexity, Hugging Face, MiniMax, Kimi, Xiaomi, Z.AI GLM, DashScope, StepFun)
2. **OAuth Device Flow** — ChatGPT (OpenAI), Nous Portal, Qwen (Alibaba), GitHub Copilot

Adapted from Hermes internally. Never credited publicly.

## Skills

- Hermes default skills (102) loaded and browsable in Settings → Skills tab
- Users enable/disable skills per-session
- Users create custom skills in sandbox

## Mobile

- Left sidebar hidden by default (`width: 0`)
- Hamburger icon in header — tap to expand
- Expands over content with backdrop overlay
- Tap backdrop or hit Escape to close

## Pricing

- Storage-based billing
- No free tier
- Compute free
- Anti-abuse monitoring + bans

## Architecture

```
bapx.in ── Caddy ──► FastAPI :7654
                       ├── /api/* — REST endpoints
                       ├── /api/agent/run — OpenAI Agents SDK (SSE)
                       ├── /api/chat/send — Direct provider chat (SSE)
                       ├── /api/sandbox/* — OpenSandbox lifecycle
                       ├── /api/admin/* — Admin panel
                       ├── /api/tts — KittenTTS voice
                       ├── /api/memory/* — Cross-session memory
                       ├── static/dashboard.html — User SPA
                       ├── static/admin.html — Admin SPA
                       └── /health — Health check
```

## Automated Pipeline

| Job | Frequency | What |
|-----|-----------|------|
| Git auto-sync | every 10m | Push to GitHub |
| Server health | every 15m | Check Caddy + backend + disk + memory |
| Server maintenance | every 30m | Log cleanup, auto-restart |
| Competitor research | every 6h | Browse Manus.im, Codex.app, ChatGPT |

## Files

- `backend.py` — FastAPI app (~1083 lines)
- `agent_runtime.py` — OpenAI Agents SDK agent with sandbox_execute tool
- `sandbox_manager.py` — OpenSandbox per-user lifecycle
- `static/dashboard.html` — Full SPA (login, signup, chat, settings, skills, sandbox)
- `static/index.html` — Landing page
- `data/bapx.db` — SQLite database
