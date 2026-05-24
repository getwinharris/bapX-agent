# bapX — The Browser-Only AI Agent Platform

https://bapx.in/

Build, deploy, and iterate with AI agents — entirely in your browser. bapX is a fork of [Hermes Agent](https://hermes-agent.nousresearch.com) with a multi-tenant SaaS wrapper, per-user sandboxes, and full BYOK (Bring Your Own Key) support.

## Architecture

```
User ───HTTPS──► Caddy (:443)
                  │
                  ├── bapx.in ───────────► main.py (landing + auth)
                  ├── app.bapx.in ───────► Fastify API (:3001)
                  │                        ├── Auth (JWT + bcrypt)
                  │                        ├── Chat (SSE streaming)
                  │                        ├── Sandbox lifecycle
                  │                        └── User management
                  └── agent.bapx.in ─────► Hermes API (:8642)
                                           └── OpenAI-compatible proxy
```

### Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + Vite + Tailwind (3-column Manus-style layout) |
| **Backend** | Fastify + TypeScript (:3001) |
| **Landing** | Python FastAPI + Jinja2 |
| **Agent Runtime** | [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) |
| **Sandbox** | [OpenSandbox](https://github.com/getwinharris/AgentSandbox) (Docker per user) |
| **Database** | SQLite (via better-sqlite3) |
| **Proxy/Certs** | Caddy (HTTPS + reverse proxy) |
| **Model Proxy** | Hermes Agent API Server (:8642) |

## Directory Structure

```
bapX/
├── agent/          # Python agent runner (OpenAI Agents SDK inside sandbox)
│   └── src/
│       ├── runner.py    # Agent runner with SSE streaming
│       ├── tools.py     # Custom function tools
│       └── skills.py    # Skill loading
├── api/            # Fastify backend
│   └── src/
│       ├── routes/
│       │   ├── auth.ts      # Login/signup/JWT
│       │   ├── chat.ts      # Chat SSE streaming + sandbox proxy
│       │   ├── sandbox.ts   # Docker sandbox lifecycle
│       │   ├── user.ts      # Profile + API key management
│       │   └── billing.ts   # Stripe integration
│       ├── db/
│       │   └── index.ts     # SQLite schema + migrations
│       ├── middleware/
│       │   └── auth.ts      # JWT verification
│       └── index.ts         # Fastify app entry
├── app/            # React SPA frontend
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx    # Main chat interface
│       │   ├── Settings.tsx     # User settings + API key config
│       │   ├── LandingPage.tsx  # Marketing/landing
│       │   ├── LoginPage.tsx    # Auth login
│       │   └── SignupPage.tsx   # Registration
│       ├── components/         # Reusable UI components
│       └── lib/
│           └── api.ts          # API client + SSE parsing
├── docker/         # Docker sandbox infrastructure
│   ├── Dockerfile.agent      # Sandbox agent image
│   └── agent-runner.py       # FastAPI agent server inside sandbox
├── docs/           # Documentation
│   └── knowledge-graph.md    # Platform knowledge graph
├── reference/      # Reference documentation from:
│   ├── manus-docs/           # Manus.im architecture
│   ├── hermes-docs/          # Hermes Agent internals
│   ├── openai-agents-docs/   # OpenAI Agents SDK
│   └── opensandbox-docs/     # OpenSandbox SDK
├── main.py         # Landing page + auth server (FastAPI)
├── login.html      # Login page (static fallback)
├── signup.html     # Signup page (static fallback)
└── static/         # Static assets
```

## Features

### Model Connectivity
Connect to AI models via multiple authentication methods:
- **API Keys** — OpenAI, Anthropic, Google, OpenRouter, or custom endpoints
- **OAuth Login** — Login with existing GPT/Claude/other provider accounts
- **Hermes Providers** — 26+ BYOK provider integrations from Hermes Agent

### Skills
bapX inherits all **97+ Hermes Agent skills** by default, including:
- Code review, debugging, and TDD
- Web research and content analysis
- Image generation and ASCII art
- DevOps (Docker, systemd, cloud)
- MCP server integrations
- Voice, video, and media processing

### Per-User Sandbox
Each user gets an isolated Docker container running:
- OpenAI Agents SDK (Python)
- Codex CLI for code generation
- Complete filesystem (Library section)
- Persistent sessions with SOUL.md system prompt

### Mobile UI
Responsive 3-column layout optimized for mobile:
- **Left sidebar** auto-minimizes to icon rail on mobile
- Expandable on demand via hamburger/gesture
- Bottom sheet for mobile chat input
- Local storage persistence for sidebar state

## Auth Methods

bapX supports all authentication methods from Hermes Agent for connecting AI models:

| Method | Description |
|--------|-------------|
| **API Key (BYOK)** | Direct API key input — OpenAI, Anthropic, Google, etc. |
| **OpenAI OAuth** | Login with existing ChatGPT/OpenAI account |
| **Anthropic OAuth** | Login with existing Claude/Anthropic account |
| **OpenRouter** | Unified API key for multiple providers |
| **Custom Endpoint** | Any OpenAI-compatible endpoint URL |
| **Hermes Gateway** | Local Hermes Agent API server (port 8642) |

## Quick Start (Development)

### Prerequisites
- Node.js v22+
- Python 3.11+
- Docker + OpenSandbox server
- Caddy

### 1. Install Dependencies

```bash
# Backend
cd api && npm install

# Frontend
cd app && npm install

# Agent
cd agent && pip install -r requirements.txt
```

### 2. Environment Setup

```bash
# API
cp api/.env.example api/.env
# Set JWT_SECRET, BAPX_INTERNAL_API_KEY, OPEN_SANDBOX_API_KEY

# Landing page
cp .env.example .env
# Set BAPX_JWT_SECRET
```

### 3. Run

```bash
# Backend (port 3001)
cd api && npm run dev

# Frontend dev server (port 5173)
cd app && npm run dev

# Landing page (port 7654)
python main.py

# Caddy reverse proxy
caddy run --config /etc/caddy/Caddyfile
```

### 4. Build for Production

```bash
cd api && npm run build
cd app && npm run build
```

## Signup → First Run Flow

1. User visits `bapx.in` → clicks **Get Started**
2. Fills signup form: username, name, age, agent name, bio, password
3. Backend creates user + generates SOUL.md (system prompt)
4. User lands on dashboard → sees **onboarding wizard**
5. Configures API key in Settings (BYOK)
6. First message → sandbox proxy → SSE streaming
7. Agent creates files → appears in Library section

## Pricing

- **Storage-based**: $5/mo base (5GB), +$1/GB addon
- **Compute**: Free (included)
- **No free plan**: All users are paying customers
- **Abuse monitoring**: Automated detection + bans

## License

MIT — see [LICENSE](./LICENSE)

---

*Built on [Hermes Agent](https://github.com/getwinharris/hermes-web-ui) | [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) | [OpenSandbox](https://github.com/getwinharris/AgentSandbox)*
