---
title: Codex Memory System
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [codex, memory, session, persistence, recall, sqlite]
confidence: high
sources: [bapX-src/codex-rs/state/src/model/memories.rs, bapX-src/codex-rs/state/src/runtime/memories.rs, bapX-src/codex-rs/memories/read/src/lib.rs]
---

# Codex Memory System

Codex has a built-in persistent memory system using SQLite, distinct from the Hermes approach.

## Architecture

### Storage Layer (SQLite + State Machine)
Files: `state/src/model/memories.rs`, `state/src/runtime/memories.rs`

The state machine tracks memory lifecycle through a SQLite `memories` table. Key operations:
- **Store** — writes key-value memory pairs per user/session
- **Read** — retrieves memories by scope and freshness
- **Clear** — wipes memories on user request
- **Migration** — versioned SQL migrations in `state/migrations/0006_memories.sql`

```sql
-- Core memories table pattern
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    scope TEXT NOT NULL,       -- 'user' | 'session' | 'global'
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    access_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Read Layer (LLM-assisted recall)
Crate: `memories/read/` located at `bapX-src/codex-rs/memories/read/`
Files: `lib.rs`, `prompts.rs`, `citations.rs`, `metrics.rs`, `usage.rs`

The read layer uses an LLM to:
1. **Parse user query** — extract memory-relevant entities and intents
2. **Search** — FTS5/fuzzy match against stored memories
3. **Rank** — score results by relevance + recency
4. **Cite** — add provenance markers to recalled facts
5. **Synthesize** — format into a natural prompt addition

Key components:
- **prompts.rs** — LLM prompts for memory extraction and synthesis
- **citations.rs** — tracks which memories were used in the current turn
- **metrics.rs** — `MEMORIES_USAGE_METRIC` telemetry for monitoring
- **usage.rs** — maps shell commands to memory usage patterns

### TUI Integration
File: `tui/src/bottom_pane/memories_settings_view.rs`

The terminal UI provides a settings popup where users can:
- Enable/disable memories per session
- View stored memories
- Reset/clear memories
- See insight: "bapX remembers things about you across sessions"

### CLI Commands
```bash
bapX memories                    # List stored memories (interactive picker)
bapX memories reset              # Clear all memories
bapX memories enable/disable     # Toggle memory collection per session
```

## How Memory Flows in a Session

1. **Session start** — Codex loads relevant memories from SQLite
2. **System prompt injection** — memories formatted as bullet points under "## Memories"
3. **User interacts** — agent may read/write memories via tool calls
4. **Session end** — new facts extracted and stored via `memories/read/` pipeline
5. **Cross-session** — next session loads from step 1

## Differences from Hermes Memory
| Aspect | Codex | Hermes |
|--------|-------|--------|
| Storage | SQLite `memories` table | JSON files (USER.md + MEMORY.md) |
| Recall | LLM-assisted extraction + FTS5 | Injected directly into system prompt |
| Scope | user/session/global | memory + user_profile |
| Auto-extract | After session, via LLM pipeline | On explicit `memory()` tool call |
| UI | TUI settings popup | `memory` tool + `session_search` FTS5 |

## See Also
- [[hermes-memory-system]] — Hermes reference implementation
- [[sandbox-isolation-architecture]] — per-user memory isolation
