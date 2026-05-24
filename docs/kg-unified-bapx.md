# bapX Platform — Unified Knowledge Graph

> Synthesized from Manus.im docs (44 pages) + Hermes Agent (341 docs) + OpenAI Agents SDK (108 docs) + OpenSandbox (104 docs)

## The Stack

```
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND: React + Vite + Tailwind (3-column Manus-style UI) │
│  Left: New Chat|Projects|MCPs|Auto|Skills|Library|Settings │
│  Center: Chat with agent (SSE streaming)                    │
│  Right: Context-dependent tabs                              │
├──────────────────────────────────────────────────────────────┤
│ BACKEND: Fastify (:3001)                                     │
│  Auth → Users → Projects → Chats → Sandbox → MCP → Auto    │
├──────────────────────────────────────────────────────────────┤
│ SANDBOX ORCHESTRATOR: OpenSandbox REST API                   │
│  Sandbox.create(metadata={"name": username})                 │
│  sandbox.commands.run() | sandbox.files.read/write           │
├──────────────────────────────────────────────────────────────┤
│ DOCKER SANDBOX (per user, named by username)                 │
│  Python 3.12 + openai-agents                                 │
│  Agent(name, instructions=SOUL.md, tools=[...])              │
│  /home/user/{projects,images,websites,presentations,...}     │
└──────────────────────────────────────────────────────────────┘
```

## How to Build Phase 1

### Step 1: Scaffold
```bash
/root/Dev/bapx/
├── app/        # React+Vite+Tailwind UI
├── api/        # Fastify backend
└── docker/     # Sandbox Dockerfile + agent-runner.py
```

### Step 2: Build UI (app/)
Pages: Login, Signup (2-step), Dashboard (3-column layout)
Components: Sidebar, ChatPanel, RightPanel (dynamic tabs)

### Step 3: Build API (api/)
Routes: /api/auth, /api/users, /api/projects, /api/chats, /api/sandbox, /api/library, /api/mcp, /api/automation, /api/skills, /api/settings
SSE streaming: /api/chats/:id/stream

### Step 4: Setup OpenSandbox
Install server → configure → create sandbox per signup

### Step 5: Agent runner (inside sandbox)
Python script using openai-agents SDK with:
- SOUL.md as instructions
- WebSearchTool, ComputerTool, CodeInterpreterTool
- Custom tools for file ops, MCP calls
- SSE bridge to backend

## Key Design Decisions

1. **Library = sandbox filesystem**: No auto-save. Library browses /home/[user]/{images,websites,...}
2. **Right panel is dynamic**: Tabs change based on what agent is building
3. **MCPs have ON/OFF toggles**: Inside MCP section, with GitHub link
4. **Skills via / command**: Slash commands load SKILL.md files
5. **Projects have master instructions**: Inherited by all chats inside
6. **SOUL.md on signup**: Tells agent who user is from day 1
7. **OpenAI Agents SDK for agent loop**: Not building from scratch
8. **OpenSandbox for Docker**: Not building from scratch

## Data Flow

```
User types → Frontend SSE → Backend → Sandbox (via OpenSandbox execd API)
  → Agent (openai-agents SDK) processes
  → Tool calls (web, browser, code, files, MCPs)
  → Files saved to sandbox filesystem
  → Results stream back through Backend → Frontend
  → Library auto-reflects new files
  → Right panel auto-switches tabs based on context
```

## Chat → Agent Flow (using OpenAI Agents SDK)

```python
from agents import Agent, Runner, WebSearchTool, ComputerTool, function_tool

@function_tool
def read_file(path: str) -> str:
    return sandbox.files.read_file(path)

agent = Agent(
    name=agent_name,
    instructions=soul_md_content,
    tools=[WebSearchTool(), ComputerTool(), read_file, ...]
)

# Stream response back via SSE
result = Runner.run_streamed(agent, user_message)
async for event in result.stream_events():
    if event.type == "raw_response_event":
        sse_send({"type": "token", "data": event.data.delta})
    elif event.type == "run_item_stream_event":
        if event.name == "tool_called":
            sse_send({"type": "tool", "data": event.item})
        elif event.name == "tool_output":
            sse_send({"type": "tool_result", "data": event.item})
```

## File System Layout in Sandbox

```
/home/{username}/
├── projects/
│   ├── project-name/
│   │   ├── source/
│   │   └── builds/
│   └── ...
├── images/          # Agent-generated images
├── websites/        # Live running websites
├── presentations/   # PPTX files
├── videos/          # Generated videos
├── documents/       # Docs, reports, spreadsheets
├── downloads/       # Downloaded files
├── skills/          # User's skills (SKILL.md files)
├── .mcp/            # MCP server configs
└── .memory/         # Agent memory files
```

## Key API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/auth/signup | Create user + sandbox |
| POST | /api/auth/login | JWT auth |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/chats/:id | Get chat history |
| POST | /api/chats/:id/stream | SSE chat with agent |
| GET | /api/library/* | Browse sandbox files |
| GET | /api/mcp | List MCPs with status |
| POST | /api/mcp/install | Install MCP |
| PATCH | /api/mcp/:id/toggle | Toggle MCP on/off |
| GET | /api/automation | List scheduled tasks |
| POST | /api/automation | Create scheduled task |
| GET | /api/sandbox/status | Sandbox health |
