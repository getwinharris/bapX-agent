# bapX

Browser-only AI agent platform at bapx.in.

## Stack

| Layer | Tool | What it does |
|-------|------|-------------|
| Backend | Python FastAPI (uvicorn, port 7654) | All API endpoints — auth, providers, chat, memory, sandbox, admin |
| Frontend | Pure HTML, CSS, JavaScript | No frameworks. Single SPA at `/dashboard.html` |
| Orchestration | OpenAI Agents SDK | Creates agent per user with web search + tool execution, streams SSE responses |
| Sandbox | OpenSandbox SDK | Per-user isolated container |
| TTS | KittenTTS | Voice responses in dashboard |
| Proxy | Caddy | Serves bapx.in, proxies `/api/*` to backend |
| Database | SQLite | Users, sessions, memory, OAuth tokens, admin data |

## Model Connections

1. **API Key** — 17 providers (OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter, xAI Grok, Groq, Mistral, Together AI, Cohere, Perplexity, Hugging Face, MiniMax, Kimi, Xiaomi, Z.AI GLM, DashScope, StepFun)
2. **OAuth Device Flow** — ChatGPT (OpenAI), Nous Portal, Qwen (Alibaba), GitHub Copilot

Users bring their own API key or log in via OAuth with their plan subscription.

## Skills

- User-created skills from sandbox, browsable and toggleable in Settings → Skills tab
- Users enable/disable skills per-session
- Custom MCPs installed via sandbox

## Mobile

Mobile-responsive sidebar: hidden by default (hamburger icon), expands on tap with backdrop overlay, closes on Escape/backdrop tap.

## Admin

Admin panel at `/admin` with:
- User management (list, ban, unban, delete)
- Platform stats (users, sessions, signups)
- Config management (SMTP, billing, OAuth client IDs)
- Notifications + mail viewer
- Automation logs

## Deployment

- Backend: `uvicorn backend:app --host 0.0.0.0 --port 7654`
- Static files mounted at `/` in FastAPI
- Caddy reverse proxy for bapx.in
- Data directory: `./data/` (SQLite DB)
