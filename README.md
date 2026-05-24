# bapX

Browser-only AI agent platform at bapx.in.

## Stack

| Layer | Tool | What it does |
|-------|------|-------------|
| Backend | Python FastAPI (uvicorn, port 7654) | All API endpoints — auth, providers, chat, memory, sandbox, admin, billing |
| Frontend | Pure HTML, CSS, JavaScript | No frameworks. Single SPA at `/dashboard.html` |
| Orchestration | OpenAI Agents SDK | Creates agent per user with web search + tool execution, streams SSE responses |
| Sandbox | OpenSandbox SDK | Per-user isolated Docker container |
| TTS | KittenTTS | Voice responses |
| Proxy | Caddy | Serves bapx.in, proxies `/api/*` to backend |
| Database | SQLite | Users, sessions, memory, OAuth tokens, billing, admin |

## Model Connections

1. **API Key** — 18 providers (OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter, xAI Grok, Groq, Mistral, Together AI, Cohere, Perplexity, Hugging Face, MiniMax, Kimi, Xiaomi, Z.AI GLM, DashScope, StepFun)
2. **OAuth Device Flow** — ChatGPT (OpenAI), Claude (Anthropic), Google (OAuth), Nous Portal, Qwen (Alibaba)
3. **Copilot** — GitHub Copilot token

Users bring their own API key or log in via OAuth with their plan subscription.  
All connected models are exposed through bapx.in's OpenAI-compatible endpoint at `/v1/chat/completions`.

## OpenAI-Compatible Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1/chat/completions` | Proxy to user's connected model using their credential |
| `GET /v1/models` | List user's current provider's models |
| `GET /v1/user/models` | List ALL models from all connected providers (API key + OAuth) |

## Skills

- 89 default skills loaded from Hermes (22 categories)
- User-created skills from sandbox, browsable and toggleable in Settings → Skills tab
- Users enable/disable skills per-session
- Custom MCPs installed via sandbox

## Billing

- Storage-based: 5GB for $5/month, $1/GB extra per month
- Stripe integration: checkout session, webhook, subscription tracking
- No free tier. Admin configures Stripe keys in admin panel.
- Storage quotas tracked per user.

## Mobile

Mobile-responsive sidebar: 48px icon rail by default (≤768px), expands to full 256px on hamburger tap with backdrop overlay.

## Codex Monorepo

Codex CLI source code is included in `codex-src/` — a full clone of the openai/codex repository at v0.133.0. The source is part of the bapX monorepo for modification and customization as the bapX agent runtime.

## Admin

Admin panel at `/admin` with:
- User management (list, ban, unban, delete)
- Platform stats (users, sessions, signups)
- Config management (SMTP, Stripe billing, OAuth client IDs/secrets)
- Notifications + mail viewer
- Automation logs

## Deployment

- Backend: `uvicorn backend:app --host 0.0.0.0 --port 7654`
- Static files mounted at `/` in FastAPI
- Caddy reverse proxy for bapx.in
- Data directory: `./data/` (SQLite DB)
