# Hermes Agent — Knowledge Graph

> Source: 341 docs from /usr/local/lib/hermes-agent/website/docs/ + AGENTS.md

## Architecture

```
cli.py / gateway/ → AIAgent (run_agent.py, ~12k LOC)
                        ↓
              Tool orchestration (model_tools.py)
                        ↓
              tools/registry.py → tools/*.py
                        ↓
              Agent loop: LLM call → tool calls → result → repeat (max 90 iterations)
```

## Core Components

### AIAgent (run_agent.py)
- Core conversation loop — fully synchronous
- ~60 constructor params: base_url, api_key, provider, model, max_iterations, enabled_toolsets, etc.
- Methods: chat(), run_conversation() — returns {final_response, messages}
- System prompt built from: config system prompt + AGENTS.md/.claude.md + skills + memory + session history

### Agent Loop
```python
while iterations < max_iterations:
    response = client.chat.completions.create(messages, tools)
    if tool_calls: execute tools, append results, loop
    else: return response.content
```

### Tool System
- tools/registry.py — auto-discovers tools via registry.register()
- Toolsets defined in toolsets.py — _HERMES_CORE_TOOLS
- Tools: terminal, file read/write/search, web, browser, delegate_task, cronjob, memory, skills, etc.

### Memory
- SQLite-backed FTS5 memory store
- Two targets: 'user' (who user is), 'memory' (environment facts)
- Injected into system prompt every turn
- session_search for past conversation retrieval

### Skills
- SKILL.md files in ~/.hermes/skills/
- YAML frontmatter + markdown body
- Triggered via /slash-commands
- Progressive disclosure: metadata → instructions → resources

### Cron/Scheduler
- cron/jobs.py + scheduler.py
- Schedule: cron expressions, duration (30m, 2h), ISO timestamps
- Runs agent autonomously, delivers results to target channel

### Gateway
- Multi-platform: telegram, discord, slack, whatsapp, signal, matrix, email, sms, etc.
- Each platform = adapter in gateway/platforms/
- SSE streaming for real-time responses

### Plugin System (plugins/)
- memory/, model-providers/, kanban/, image_gen/, observability/, etc.
- Context engines for dynamic system prompt injection

### Kanban Board
- Multi-agent orchestration: board → dispatcher → workers
- Workers pick tasks from kanban board, execute independently

## Key Patterns for bapX
- PROFILE/AURA/SOUL concept: persistent user context files
- Skills as SKILL.md files with progressive loading
- Tool registry: register() → discover_builtin_tools() → handle_function_call()
- Session DB for conversation history with FTS5 search
- Cron scheduler for recurring tasks
