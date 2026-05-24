---
title: VPS Knowledge Graph — Full System Map
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [architecture, infra, orchestration, data-flow, vps]
confidence: high
---

# VPS Knowledge Graph

## Physical Topology

```
                     Internet
                        |
                    Caddy :80/:443
                   /        |        \
                  /         |         \
          bapx.in        agent.bapx.in    (future domains)
         (landing)        (dashboard)
              \              |
           reverse_proxy    reverse_proxy
               \              |
              backend.py :7654 (FastAPI)
                  |         |          |            |
           auth/login   sandbox     search    provisioning
                  |         |          |            |
          SQLite DB    OpenSandbox   SearXNG    tools/manifest.json
           bapx.db    server :8080   :8888         (28 scripts)
                         |
                    Docker Engine
                    /            \
          sandbox-user1       sandbox-user2
          172.17.0.3            (future)
          ubuntu image
             |
      ~/.bapx/ (inside sandbox)
      ├── auth.json / config.toml
      ├── tools/ (28 scripts)
      ├── skills/ (.system/ 5 built-in)
      └── memories/
```

## Port Map

| Port | Service | Scope | Purpose |
|------|---------|-------|---------|
| 22 | SSH | Public | Remote access |
| 53 | systemd-resolve | Local | DNS |
| 80 | Caddy | Public | HTTP → HTTPS redirect |
| 443 | Caddy | Public | HTTPS, TLS termination |
| 2019 | Caddy admin | Local | Config API |
| 7654 | FastAPI backend | Public | bapX API (via Caddy proxy) |
| 8080 | OpenSandbox server | Local | Docker sandbox orchestration |
| 8642 | Hermes bridge | Local | Hermes gateway API |
| 8648 | Hermes web UI | Public | Hermes frontend |
| 8888 | SearXNG | Public | Web search engine |
| 45853 | containerd | Local | Container runtime |
| 48099 | Sandbox user1 CDP | Mapped | Browser CDP endpoint |
| 51847 | Sandbox user1 SSH | Mapped | Sandbox terminal |

## Request Flows

### A. User loads bapx.in (landing page)
```
Browser → Caddy :443 → static/index.html
```

### B. User loads agent.bapx.in (dashboard)
```
Browser → Caddy :443 → static/dashboard.html
  → JS calls /api/login → backend :7654 → SQLite → JWT token
  → JS calls /api/user/profile → backend :7654
  → JS calls /api/providers → backend :7654
  → JS calls /api/providers/oauth → backend :7654
```

### C. User connects an API key
```
Settings page → submit API key
  → POST /api/sandbox/write-file (config.toml)
    → backend exec_in_sandbox()
      → OpenSandbox :8080 → Docker sandbox
        → writes to ~/.bapx/config.toml
```

### D. User connects via OAuth
```
Settings → click OAuth button
  → POST /api/auth/oauth/start → returns flow_id + user_code
  → Modal shows code + verification URL
  → User authorizes in popup window
  → Poll /api/auth/oauth/token-exchange every 3s
    → On complete: writes token to sandbox ~/.bapx/auth.json
```

### E. User sends chat message
```
Chat input → POST /api/sandbox/stream
  → Backend calls get_sandbox_status (OpenSandbox :8080)
  → If stopped: start_sandbox (OpenSandbox :8080)
  → exec_in_sandbox: `echo 'message' | bapX exec --timeout 120`
    → Codex fork runs inside sandbox
    → Codex uses auth from ~/.bapx/config.toml
    → Codex uses tools from ~/.bapx/tools/
    → Codex uses skills from ~/.bapx/skills/
  → Streams SSE response back to frontend
```

### F. Web search
```
Agent request → POST /api/search
  → Backend proxies to SearXNG :8888/search?format=json
  → SearXNG aggregates results from: Google, Bing, DuckDuckGo, etc.
  → Returns structured results (title, url, content, engine)
  → Backend returns to agent
```

### G. Sandbox tools provisioning
```
Admin request → POST /api/sandbox/provision-tools
  → Reads tools/manifest.json (28 tools)
  → For each tool_*.py: cat > ~/.bapx/tools/{name}
  → pip3 install all deps from manifest
  → apt-get install tesseract-ocr, poppler-utils
  → Returns list of installed tools
```

### H. Deploy website
```
Deploy view → POST /api/user/publish
  → exec_in_sandbox: `cd ~/project && npm run build`
  → On success: records in deployments table
  → URL: https://{project}.bapx.app
```

## Service Dependencies

```
Caddy ──depends on──► backend.py :7654
                            │
backend.py ──depends on──► SQLite (bapx.db)
backend.py ──depends on──► OpenSandbox server :8080
backend.py ──depends on──► SearXNG :8888
backend.py ──depends on──► tools/manifest.json
                            │
OpenSandbox ──depends on──► Docker Engine
OpenSandbox ──depends on──► ubuntu image (Docker)
                            │
Sandbox ──depends on──► bapX (Codex fork binary)
Sandbox ──depends on──► Python3 + pip
Sandbox ──depends on──► Node.js + npm (for deploy builds)
Sandbox ──depends on──► tesseract-ocr (for OCR tool)
Sandbox ──depends on──► Chromium (future: for browser tool)
Sandbox ──depends on──► agent-browser (future: for CDP)
```

## Tool Call Chains

### Chat with tool use
```
User message
  → exec_in_sandbox("echo 'msg' | bapX exec")
    → Codex runtime loads agent
    → Codex detects user wants to create a presentation
    → Codex calls bapX pptx create '{"slides": [...]}'
      → tool_pptx.py runs python-pptx
      → Saves presentation.pptx to filesystem
    → Codex returns result
  → SSE stream back to frontend
```

### Web research
```
User: "Research latest transformer papers"
  → exec_in_sandbox("echo '...' | bapX exec")
    → Codex calls bapX arxiv search '{"query": "transformer 2026"}'
      → tool_arxiv.py calls arxiv API
      → Returns paper list
    → Codex reads each paper abstract
    → Codex calls bapX ocr pdf-text '{"path": "paper.pdf"}'
      → tool_ocr.py extracts text
    → Codex synthesizes summary
    → Codex may call bapX wiki update '{"page": "transformers-2026", ...}'
      → Updates llm-wiki
  → SSE stream back
```

### Full deploy pipeline
```
User: "Build and deploy my app"
  → Frontend: create project
  → exec_in_sandbox("git clone <repo>")
  → exec_in_sandbox("npm install")
  → exec_in_sandbox("npm run build")
  → POST /api/user/publish → records deployment
  → exec_in_sandbox("npx vercel --prod")
    → Or: bapX deploy vercel '{"dir": "/project"}'
      → tool_deploy.py runs vercel CLI
```

## Data Flow Diagram

```
┌─────────────┐     HTTPS      ┌──────────┐    HTTP    ┌──────────────┐
│   Browser   │ ◄───────────► │  Caddy   │ ◄─────────► │  FastAPI     │
│  (user)     │     :443      │ :80/:443 │   :7654     │  backend.py  │
└─────────────┘               └──────────┘             └──────┬───────┘
                                                              │
                                    ┌─────────────────────────┼──────────┐
                                    │                         │          │
                               ┌────▼────┐             ┌─────▼────┐  ┌──▼───┐
                               │ SQLite  │             │OpenSandbox│  │SearXNG│
                               │ bapx.db │             │  :8080    │  │:8888  │
                               └─────────┘             └─────┬─────┘  └──────┘
                                                             │
                                                    ┌────────▼────────┐
                                                    │  Docker Engine  │
                                                    └────────┬────────┘
                                                             │
                                                ┌────────────▼────────────┐
                                                │  Sandbox (user1)        │
                                                │  172.17.0.3             │
                                                │  ┌───────────────────┐  │
                                                │  │  bapX (Codex)     │  │
                                                │  │  Auth: config.toml│  │
                                                │  │  Tools: 28 scripts│  │
                                                │  │  Skills: 5 system │  │
                                                │  │  Memory: SQLite   │  │
                                                │  │  Browser: Chromium│  │
                                                │  └───────────────────┘  │
                                                └─────────────────────────┘
```

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Backend | `/root/Dev/bapx/backend.py` | FastAPI app (1410 lines) |
| Frontend HTML | `/root/Dev/bapx/static/dashboard.html` | SPA |
| Frontend CSS | `/root/Dev/bapx/static/dashboard.css` | Styles |
| Frontend JS | `/root/Dev/bapx/static/dashboard.js` | Logic |
| Landing | `/root/Dev/bapx/static/index.html` | Landing page |
| Caddy config | `/root/Dev/bapx/Caddyfile` | Reverse proxy |
| Tool manifest | `/root/Dev/bapx/tools/manifest.json` | 28 tool definitions |
| Tool scripts | `/root/Dev/bapx/tools/tool_*.py` | Python CLI tools |
| Provision script | `/root/Dev/bapx/tools/provision.sh` | Sandbox bootstrap |
| Codex source | `/root/Dev/bapx/bapX-src/` | Rust source |
| Wiki | `/root/Dev/bapx/wiki/` | Knowledge base |
| Hermes home | `/root/.hermes/` | Hermes agent config |
| Hermes skills | `/root/.hermes/skills/` | 106 skill files |
| Hermes source | `/usr/local/lib/hermes-agent/` | Python framework |

## Auth / Secret Locations

| Secret | Location | Used By |
|--------|----------|---------|
| BAPX_JWT_SECRET | Environment variable | backend.py |
| API keys (user) | Sandbox `~/.bapx/config.toml` | bapX runtime |
| OAuth tokens (user) | Sandbox `~/.bapx/auth.json` | bapX runtime |
| User accounts | `data/bapx.db` (SQLite) | backend.py |
| Stripe keys | `admin_config` table | Billing |
| SMTP creds | Environment variables | Email |
| SearXNG key | Docker env | SearXNG |

## DNS Records

| Domain | CNAME/Type | Target |
|--------|-----------|--------|
| bapx.in | A | VPS IP |
| www.bapx.in | CNAME | bapx.in |
| agent.bapx.in | CNAME | bapx.in |
| *.bapx.app | A | VPS IP (future) |

## External API Dependencies

| API | Used By | Purpose |
|-----|---------|---------|
| OpenAI API | bapX runtime | Chat completions, image gen |
| Anthropic API | bapX runtime | Claude models |
| SearXNG (self-hosted) | backend → sandbox | Web search |
| Stripe | backend | Billing subscriptions |
| SMTP | backend | Email verification, password reset |
| GitHub API | user sandbox | Git repos |
| Vercel API | user sandbox | Deploy (optional) |
| Firebase API | user sandbox | Deploy (optional) |
| Railway API | user sandbox | Deploy (optional) |
| GCP API | user sandbox | Deploy (optional) |
| Supabase API | user sandbox | Deploy (optional) |
| Notion API | user sandbox | Tool |
| Linear API | user sandbox | Tool |
| Airtable API | user sandbox | Tool |
| Spotify API | user sandbox | Tool |
| X/Twitter API | user sandbox | Tool |
| Tenor API | user sandbox | GIF search |
| YouTube API | user sandbox | Transcripts |
| arXiv API | user sandbox | Paper search |
| Google Workspace API | user sandbox | Gmail, Calendar, Drive |
| OSM API | user sandbox | Maps, geocode |
