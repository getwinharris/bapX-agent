---
title: Sandbox Isolation Architecture
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [sandbox, docker, opensandbox, isolation, architecture]
confidence: high
---

# Sandbox Isolation Architecture

Each user gets their own Docker container via OpenSandbox. Every sandbox
is a completely isolated virtual machine with its own:
- Network namespace
- Filesystem (`~/.bapx/`)
- Auth tokens and credentials
- Installed tools and dependencies
- Chromium instance with CDP
- bapX agent runtime (Codex fork)

## What Lives in the Sandbox
```
~/.bapx/
  auth.json          — OAuth tokens for providers
  config.toml        — API keys for providers
  tools/             — bapX built-in tool scripts (28 total)
    tool_pptx.py
    tool_ocr.py
    tool_deploy.py
    ...
  skills/            — User-installed skills
    .system/         — Built-in system skills (5)
      bapx-docs/
      imagegen/
      skill-creator/
      skill-installer/
      plugin-creator/
  mcps/              — MCP server configurations
  memories/          — Cross-session memory store
    USER.md          — User profile
    MEMORY.md        — Persistent facts
  bin/               — bapX tool runner
```

## What Lives on the Host VPS
| Service | Port | Purpose |
|---------|------|---------|
| FastAPI backend | 7654 | Auth, billing, sandbox lifecycle |
| Caddy | 80/443 | Reverse proxy, TLS, static files |
| OpenSandbox server | 8080 | Docker sandbox orchestration |
| SearXNG | 8888 | Self-hosted web search engine |
| KittenTTS | (varies) | Text-to-speech for frontend |

## Provisioning Flow
1. User signs up → backend creates account
2. User logs in → backend starts sandbox via OpenSandbox
3. Sandbox created → auto-provisioned with:
   - bapX runtime (Codex fork)
   - 28 built-in tool scripts
   - Python deps (python-pptx, pymupdf, etc.)
   - System deps (tesseract-ocr, poppler-utils)
   - Chromium + agent-browser
   - Authenticated with user's providers
4. Frontend connects to sandbox via API
5. Agent actions execute in sandbox via exec_in_sandbox()

## Security Model
- Sandbox has NO access to host filesystem (except defined bridges)
- Each sandbox has unique device ID
- Credentials never leave the sandbox
- Billing failures → sandbox frozen at 2 days, pruned at 14 days

See [[hermes-agent-blueprint]] for the reference architecture.
See [[bapx-tools-manifest]] for the 28 built-in tools.
