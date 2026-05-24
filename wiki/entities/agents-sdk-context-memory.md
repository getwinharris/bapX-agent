---
title: OpenAI Agents SDK — Context & Memory
created: 2026-05-24
updated: 2026-05-24
type: entity
tags: [agents-sdk, context, memory, session, orchestration]
confidence: medium
---

# OpenAI Agents SDK Memory & Context

Used as the server-side orchestrator for bapX (runs on the host, not inside sandbox).
The SDK manages agent conversation flow, tool execution, and handoffs.

## Key Memory/Context Concepts

### 1. RunContext
Each agent run has a `RunContext` that carries:
- `RunConfig` — model, tools, instructions
- Agent state — current agent, handoff history
- Input/output items — the message chain
- Usage — token counts, tool call stats

### 2. Agent Instructions (System Prompt)
Each agent has an `instructions` field that serves as its system prompt.
This is where memory context gets injected:
```python
agent = Agent(
    name="bapX Agent",
    instructions="You are an AI agent. " + memory_context,
    tools=[...],
)
```

### 3. Tool Context
Tools receive `RunContext` and can read/write session data:
```python
@function_tool
async def remember(key: str, value: str, ctx: RunContext):
    ctx.session.user_data[key] = value
    return "Remembered"
```

### 4. Handoff Context
When handing off between agents, context carries:
- Source agent identity
- Handoff rationale
- Cross-agent memory (thread-local)

### 5. No Built-in Persistence
The Agents SDK does NOT have built-in persistent memory.
It provides the framework for context passing but expects the developer
to implement their own storage (SQLite, Redis, files, etc.).

## bapX Integration
The SDK runs on the host VPS to orchestrate high-level flows:
```
User message → Agents SDK orchestrator (host)
  → Routes to sandbox bapX (Codex fork)
    → Codex handles tools, memory, skills inside sandbox
  → SDK streams response back to user
```

The SDK is NOT responsible for memory — that's Codex's job inside the sandbox.

## See Also
- [[codex-memory-system]] — actual memory storage
- [[sandbox-isolation-architecture]] — why memory lives in sandbox
