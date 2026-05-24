---
title: Hermes Memory System
created: 2026-05-24
updated: 2026-05-24
type: entity
tags: [hermes, memory, session, persistence, blueprint]
confidence: high
---

# Hermes Memory System

The reference implementation that bapX should replicate.

## Two-Store Architecture

### 1. USER.md — User Profile
- Location: `~/.hermes/memories/USER.md`
- Content: Who the user is — name, role, preferences, communication style, pet peeves
- Written via: `memory(action='add', target='user', ...)`
- Injected into: System prompt every session

### 2. MEMORY.md — Persistent Facts
- Location: `~/.hermes/memories/MEMORY.md`
- Content: Environment facts, project conventions, tool quirks, lessons learned
- Written via: `memory(action='add', target='memory', ...)`
- Injected into: System prompt every session (compact, ~2200 char limit)

### Key Design Rules
- **NO task progress or completed-work logs** — those go in session_search
- **NO stale facts** — if it won't matter in 7 days, don't save
- **Prioritize user preferences > environment facts > procedural knowledge**
- **Replace/remove outdated entries** — `memory(replace)` + `memory(remove)`

### Cross-Session Search (FTS5)
Separate from memory storage:
- `session_search(query)` — FTS5 over all past transcripts
- Returns: matching sessions with bookends (goal → match → resolution)
- Use for: recalling what was done before, finding specific decisions

## How Memory Flows

### Write Path
```
User corrects agent → agent identifies durable fact
  → memory(action='add', target='memory|user', content='fact')
  → Appended to USER.md or MEMORY.md
```

### Read Path (every session start)
```
Session init → read USER.md + MEMORY.md
  → Inject into system prompt
  → Agent acts with full context
```

### Cleanup
- Replace outdated entries when context changes
- Remove expired/irrelevant facts
- Session_search for task history (don't bloat memory with it)

## bapX Port
For [[sandbox-isolation-architecture]], each sandbox gets:
- `~/.bapx/memories/USER.md` — user profile
- `~/.bapx/memories/MEMORY.md` — persistent facts
- `bapX memory add/replace/remove` — CLI tool
- `bapX session-search` — FTS5 cross-session recall
- Background curator — prune stale memories, compact when bloated

## See Also
- [[codex-memory-system]] — Codex SQLite-based alternative
- [[hermes-curator-system]] — automatic memory maintenance
- [[hermes-cron-system]] — scheduled maintenance jobs
