# bapX — The Agent That Grows With You

https://bapx.in/

Build, deploy, and iterate with AI agents — entirely in your browser. Your agent learns your preferences, builds skills from your workflows, and grows smarter over time.

## Architecture

```
User ───HTTPS──► bapx.in ───► Python FastAPI (:7654)
                   │
                   ├── Auth (JWT + bcrypt)
                   ├── User profile + API key management
                   ├── Chat proxy → user's LLM provider
                   └── Sandbox lifecycle
                           │
                           ▼
                   ┌── Docker per user ──────────────┐
                   │  Codex CLI (agent runtime)       │
                   │  OpenAI Agents SDK (orchestrator) │
                   │  User's API key (BYOK)            │
                   │  SOUL.md (system prompt)          │
                   └──────────────────────────────────┘
```

### Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python FastAPI |
| **Frontend** | Pure HTML/CSS/JS (no frameworks) |
| **Agent Runtime** | [Codex CLI](https://github.com/openai/codex) — OpenAI's coding agent inside your sandbox |
| **Orchestration** | [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) — multi-agent workflows |
| **Sandbox** | Docker per user (isolated environment) |
| **MCPs** | HTTP API connections — users install MCP servers in their sandbox |
| **Database** | SQLite (per-user data isolation) |
| **Proxy/Certs** | Caddy (HTTPS + reverse proxy) |

## Directory Structure

```
bapX/
├── backend.py         # Python FastAPI — all backend routes
├── static/            # Pure HTML/CSS/JS frontend
│   ├── index.html     # Landing page
│   ├── login.html     # Login
│   ├── signup.html    # Signup
│   └── dashboard.html # Main SPA
├── docker/            # Sandbox container
│   ├── Dockerfile.agent
│   └── agent-runner.py   # OpenAI Agents SDK orchestrator
├── data/              # SQLite databases
└── docs/              # Documentation
```

## Key Features

### AI Model Connectivity
Connect to any LLM provider via API key:
- **OpenAI** — GPT-5.4, GPT-4.1, GPT-4o, o3
- **Anthropic** — Claude Sonnet 4, Haiku 3.5
- **Google** — Gemini 2.5 Flash/Pro
- **DeepSeek** — deepseek-chat, deepseek-reasoner
- **OpenRouter** — 200+ models, unified billing
- **xAI** — Grok 3, Grok 2
- **+20 more** — Groq, Together, Mistral, Perplexity, etc.

### Agent Runtime (Codex CLI)
Inside each user's sandbox, Codex CLI provides:
- Autonomous code generation and editing
- File system operations
- MCP server integration
- Multi-agent coordination via OpenAI Agents SDK
- Self-learning: skills extracted from completed workflows

### MCP Integration
Users install MCP servers in their sandbox via HTTP API:
```
POST /api/mcp/install  → installs MCP server
POST /api/mcp/connect  → connects via HTTP to running MCP
GET  /api/mcp/list     → shows installed MCPs
```
Each MCP runs as a subprocess inside the user's Docker container, connected via HTTP API to the agent runtime.

### Self-Learning Skills
Your agent builds a personal skill library:
- Completed workflows are saved as reusable skills
- Skills appear in your Library section
- Skills are scoped to your sandbox (private)
- Skills can be shared via the MCP marketplace

## Setup (Development)

### Prerequisites
- Python 3.11+
- Docker (for sandbox containers)
- Caddy (for HTTPS)
- Node.js 22+ (for Codex CLI build)

### Quick Start

```bash
# 1. Install Python deps
pip install fastapi uvicorn slowapi bcrypt passlib httpx pydantic python-jose

# 2. Set JWT secret
export BAPX_JWT_SECRET="your-32-char-secret-here-change-me"

# 3. Start backend
cd /root/Dev/bapx
python3 backend.py  # runs on port 7654

# 4. Set up Caddy
caddy run --config /etc/caddy/Caddyfile  # HTTPS proxy
```

### Sandbox Container

```bash
# Build the sandbox image
docker build -t bapx-agent:latest -f docker/Dockerfile.agent .

# The backend auto-starts sandboxes per user via Docker API
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/signup` | Create account |
| POST | `/api/login` | Login |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/user/profile` | Get profile + API key status |
| PUT | `/api/user/profile` | Update name, age, bio, etc. |
| PUT | `/api/user/api-key` | Set LLM provider + API key |
| PUT | `/api/user/skills` | Save enabled skills list |

### OAuth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/oauth/start` | Select OAuth provider |
| POST | `/api/auth/oauth/save` | Save OAuth provider |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat/send` | Stream LLM response via SSE |
| GET | `/api/sessions` | List chat sessions |
| DELETE | `/api/sessions/:id` | Delete session |

### Skills
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills` | List all available skills |

### Sandbox
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sandbox/start` | Start user's sandbox container |
| POST | `/api/sandbox/stop` | Stop sandbox |
| GET | `/api/sandbox/status` | Check sandbox health |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Pricing

- **Storage-based**: $5/mo base (5GB), +$1/GB addon
- **Compute**: Free (included in all plans)
- **No free plan**: All users are paying customers
- **Abuse monitoring**: Automated detection + bans

## License

MIT — see [LICENSE](./LICENSE)
