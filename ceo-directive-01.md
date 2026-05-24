# bapX — CEO Directive: Build the Runtime Spine

## Architecture (confirmed)

```
User → bapX Chat (HTML/JS) → FastAPI backend → OpenAI Agents SDK
                                                     ↓
                                              Dynamically connects to
                                              user's provider/model
                                              using user's credential
                                              (API key OR OAuth token)
                                                     ↓
                                              Has tools including:
                                              - WebSearch
                                              - Codex inside sandbox
                                              - File operations
                                              - Session memory
                                                     ↓
                                              Response streams back
                                              to chat via SSE
```

## Current State

### What works
- ✅ Signup/login with JWT
- ✅ 22 providers (18 API key + 4 OAuth device flow)
- ✅ OAuth endpoints (start, poll, status)
- ✅ Skills page UI (loads from data/skills/)
- ✅ Chat UI with SSE streaming
- ✅ Session management
- ✅ Sandbox endpoints (start/stop/status/exec)
- ✅ TTS endpoint
- ✅ Memory endpoints
- ✅ Admin panel (users, stats, config, notifications)
- ✅ Caddy reverse proxy
- ✅ Codex (bapXcodex) at /usr/local/bin/bapXcodex

### What needs building (Phase 1 — Runtime Spine)

**1. Wire chat → Agents SDK → sandbox Codex correctly**

The /api/agent/run endpoint (backend.py line 750) currently uses `stream_agent_response()` with skills loading. It should:
- Take user's message + session history
- Create an OpenAI Agents SDK Agent with:
  - `instructions` from user's SOUL.md + system prompt
  - Tools: WebSearch, codex_execute (calls bapXcodex in sandbox), memory_store
  - `model` set to user's configured provider/model
- Use `MultiProvider` to dynamically route to user's provider
- Stream response back via SSE

**2. Make the chat flow work end-to-end**

Current flow:
- User types message
- Dashboard JS calls POST /api/agent/run with SSE
- Backend creates agent, runs it, streams response
- Dashboard renders markdown + TTS button

Needs to actually work — test with a real provider (OpenAI API key).

**3. Sandbox Codex integration**

When the agent decides coding is needed:
- It calls the `codex_execute` function tool
- That tool runs bapXcodex inside the user's sandbox (via sandbox exec)
- Results stream back as tool output

## Priority

Build #1 first — get one end-to-end conversation working. Then iterate.

## Files

- /root/Dev/bapx/backend.py — FastAPI app (ALL routes)
- /root/Dev/bapx/agent_runtime.py — OpenAI Agents SDK integration (stream_agent_response)
- /root/Dev/bapx/agent_orchestrator.py — Agent tools (codex_execute, tts_generate, etc.)
- /root/Dev/bapx/static/dashboard.html — Frontend (inline JS)
- /root/Dev/bapx/sandbox_manager.py — OpenSandbox lifecycle

## Constraints
- NO new pip installs — everything is already installed
- NO Hermes references
- Commit to main after testing
