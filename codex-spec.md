# bapX Build Spec — Phase 2: Integrate the Full Stack

## Objective
Wire OpenAI Agents SDK, OpenSandbox, and Codex CLI into the actual bapX product. Currently they're installed but not connected. When a user signs up, they should get an isolated sandbox. When they chat, their message should go through Codex CLI in their sandbox, orchestrated by OpenAI Agents SDK.

## What to build

### 1. OpenSandbox per-user on signup
In `backend.py`, modify the signup flow to create an OpenSandbox sandbox for each new user.
- Import OpenSandbox: `from opensandbox import Sandbox, ConnectionConfig`
- On signup success, create a sandbox: `Sandbox.create("ubuntu", connection_config=ConnectionConfig(...))`
- Store the sandbox_id in the user's database record (add a `sandbox_id TEXT` column to users table)
- Set resource limits per user: `resourceLimits: { cpu: "500m", memory: "1Gi" }`
- On account cleanup, destroy the sandbox

### 2. OpenAI Agents SDK agent team
Create a new file `agent_orchestrator.py` that uses OpenAI Agents SDK to build agent teams.
- Import: `from agents import Agent, Runner, function_tool`
- Create a CodexAgent that delegates tasks to Codex CLI
- Create a TTSAgent that calls the TTS endpoint
- Create a MemoryAgent that handles cross-session memory
- Create a team/router that takes user messages and routes them to the right agent

### 3. Wire chat through Codex CLI in sandbox
Modify the `POST /api/chat/send` endpoint:
- Look up the user's sandbox_id
- If sandbox exists, send the message into the sandbox: run `codex exec "user message"` inside the sandbox
- If no sandbox, create one
- Stream the Codex output back via SSE
- Use OpenAI Agents SDK Runner to coordinate

### 4. Add sandbox status endpoint
Add GET /api/sandbox/status that returns:
- Whether user's sandbox exists
- Sandbox state (running/paused/terminated)
- Resource usage (CPU, memory)

### 5. Add sandbox_management table
Add a SQLite table for sandboxes:
```sql
CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

## Files to modify/create
- `/root/Dev/bapx/backend.py` — modify signup, chat endpoint, add sandbox status endpoint
- `/root/Dev/bapx/agent_orchestrator.py` — NEW: OpenAI Agents SDK agent team
- `/root/Dev/bapx/main.py` — may need to import agent_orchestrator

## Constraints
- Pure Python FastAPI — no Node.js
- OpenSandbox SDK is at `pip show opensandbox` version 0.1.9
- OpenAI Agents SDK is at `pip show openai-agents` version 0.17.3
- Codex CLI is at `~/.hermes/node/bin/codex`
- API key for Codex: `export CODEX_API_KEY=hermes-codex-bridge`
- All existing endpoints must keep working

## Git
Git is authenticated at https://github.com/getwinharris/bapX-agent.git.
Commit and push: `git add -A && git commit -m "phase2: integrate OpenSandbox + OpenAI Agents SDK + Codex CLI" && git push`

## Verification
1. Backend starts: uvicorn main:app --port 7654
2. Signup creates sandbox: check GET /api/sandbox/status after signup
3. Health: curl http://localhost:7654/health returns 200
4. Chat works: POST /api/chat/send with message returns SSE stream
