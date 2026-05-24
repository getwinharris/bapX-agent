# bapX

Browser-only AI agent platform at bapx.in.

## Tools & Frameworks

Your instructions:

> "we are building it from scratch with python fast api pure html css js no react no node no typescript nothing only pure python backend and pure html css js front"

> "no docker for sandbox use opensandbox sdk and openai agents sdk"

| Layer | Tool |
|-------|------|
| Backend | Python FastAPI (uvicorn, port 7654) |
| Frontend | Pure HTML, CSS, JavaScript — **no React, no Node, no TypeScript** |
| Orchestration | OpenAI Agents SDK — complete orchestration layer to build agent teams/workflows |
| Sandbox | OpenSandbox SDK — complete isolated sandbox per user + agent teams (not Docker CLI) |
| Agent Runtime / CTO | Codex CLI — runs inside OpenSandbox as the powered developer CTO |
| Reverse Proxy | Caddy |
| Database | SQLite |
| CI / Pipeline | Hermes cron jobs (git sync, health, maintenance, competitor research) |
| TTS / Voice | KittenTTS — agent voice responses in the web UI |
| Browser Automation | Hermes browser-use skills (Playwright + Chrome) |
| Presentation / Creative | Existing installed Hermes skills: excalidraw, architecture-diagram, p5js, claude-design, sketch, pixel-art, ascii-art, manim-video, popular-web-designs, baoyu-comic, baoyu-infographic, etc. — usable by any agent, not Hermes-specific |
| Dev Workflow | Two-Codex: Hermes (CEO) writes spec → Codex CTO builds in isolated worktree → Codex Reviewer audits → Hermes accepts/rejects |

## Agent Runtime

Codex CLI is the agent runtime — already a complete agent with:
- Self-improving instruction triggers
- Auto-setup cron jobs

**What Codex has** — self-improving triggers, cron, project-based memory, full agent capabilities

**What bapX adds on top (what Codex doesn't have):**
- Cross-session memory (Codex only has project-based, no long-term memory across sessions)
- BYOK (Codex uses its own auth — bapX lets users bring their own API keys to Codex)
- Self-building skills adapting to user workflow (like Hermes skill system)
- MCP support (Codex doesn't natively support MCP)
- All model connection methods from Hermes (API keys + OAuth device flow for ChatGPT, Claude, Grok, Gemini, etc.)

## Model Connection Methods

> "we need all the authentication method from hermes to connect ai model not only by API but also by login with gpt existing plan claude existing plan everything from hermes for connecting models"

1. API Key — 20+ providers (OpenAI, Anthropic, Google, DeepSeek, OpenRouter, xAI Grok, Perplexity, etc.)
2. OAuth Device Flow — ChatGPT, Claude, Grok, Gemini, Nous, Qwen, Copilot

All adapted from Hermes internally. Never credited to Hermes publicly.

## Skills & MCPs

> "skills and mcp it should be on the users and sandbox... we need to build our specific skills for our project not from hermes"

- Skills are **user-generated** in sandbox — users save workflows as reusable skills
- MCPs are **user-installed** in sandbox via HTTP API
- We build our **own bapX-specific platform skills**

## Mobile

> "optimise the responsive UI for mobile when the left side bar is need to be minimised only need to be maxed on demand on the mobile"

- Left sidebar: w-12 icon rail by default on mobile
- Expands to full width on tap with backdrop overlay
- State persisted in localStorage

## Pricing

> "storage-based pricing, compute free" — "no free plan"

- Storage-based billing
- No free tier
- Compute is free
- Anti-abuse monitoring + bans

## Dev Team

| Role | Who | Job |
|------|-----|-----|
| Founder | Harris | Direction |
| CEO | Hermes | Writes specs from founder, reviews Codex output, maintains server |
| CTO | Codex | Builds features in isolated git worktrees |
| Reviewer | Codex (second agent) | Audits CTO output against original instructions |

Two-Codex pipeline: Your direction → CEO writes spec → CTO builds → Reviewer audits → CEO accepts/rejects.

## Automated Pipeline

| Job | Frequency | What |
|-----|-----------|------|
| Git auto-sync | every 10m | Push to GitHub |
| Server health | every 15m | Check Caddy + backend + disk + memory |
| Server maintenance | every 30m | Log cleanup, auto-restart, silent unless fixing |
| Competitor research | every 6h | Browse Manus.im, Codex.app, ChatGPT |

## Architecture

```
bapx.in ── Caddy ──► FastAPI :7654
                       ├── /api/* — REST endpoints
                       ├── /api/agent/run — OpenAI Agents SDK orchestration (SSE)
                       ├── /api/chat/send — Direct provider chat (SSE, fallback)
                       ├── /api/sandbox/* — OpenSandbox lifecycle per user
                       ├── /api/admin/* — Admin panel (CEO/Founder)
                       ├── /api/tts — KittenTTS voice
                       ├── /api/memory/* — Cross-session memory
                       ├── static/dashboard.html — User SPA
                       ├── static/admin.html — Admin SPA
                       └── /health — Health check
```

## Integrated Stack

| Layer | Tool | What it does | Status |
|-------|------|-------------|--------|
| Orchestration | OpenAI Agents SDK | Creates agent per user with WebSearchTool + sandbox_execute, streams responses | ✅ Integrated at `/api/agent/run` |
| Sandbox | OpenSandbox SDK | Per-user isolated Docker sandbox, lifecycle management | ✅ Integrated at `/api/sandbox/*` |
| Agent Runtime | Codex CLI | Available for execution inside sandbox as powered CTO | ✅ Installed at `~/.hermes/node/bin/codex` |
| Dashboard Chat | Agent runtime | User messages route through agent runtime by default | ✅ Wired to `/api/agent/run` |
| Admin Panel | FastAPI + SPA | CEO/Founder manages users, config, billing, notifications | ✅ At `/admin.html` |

## Files

- main.py — FastAPI entry point (2 lines, re-exports backend)
- backend.py — 651 lines, all API endpoints (signup, login, providers, skills, chat, sessions, OAuth)
- static/dashboard.html — 1046 line SPA (login, signup, chat, settings, skills)
- static/index.html — Landing page
- data/bapx.db — SQLite database (users, sessions, api_keys, oauth_tokens)
- README.md — This file

## Scope

Nothing beyond bapx.in. Building, maintaining, researching competitors, suggesting updates, server upkeep.
