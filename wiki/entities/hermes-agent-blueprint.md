---
title: Hermes Agent — bapX Blueprint
created: 2026-05-24
updated: 2026-05-24
type: entity
tags: [hermes, blueprint, architecture, tools]
confidence: high
---

# Hermes Agent — Reference Architecture

Hermes Agent (by Nous Research) is the **reference blueprint** for bapX.
It is an open-source AI agent framework used to build bapX. After bapX ships,
Hermes will be removed — bapX stands on its own.

## Key Features to Port

### 1. Tool System
Hermes has a flexible toolset system defined in `toolsets.py`. The core tools (`_HERMES_CORE_TOOLS`) include:

**Web:** `web_search`, `web_extract`
**Terminal:** `terminal`, `process`
**Files:** `read_file`, `write_file`, `patch`, `search_files`
**Vision/Image:** `vision_analyze`, `image_generate`
**Skills:** `skills_list`, `skill_view`, `skill_manage`
**Browser (CDP-based):** `browser_navigate`, `browser_snapshot`, `browser_click`,
  `browser_type`, `browser_scroll`, `browser_back`, `browser_press`,
  `browser_get_images`, `browser_vision`, `browser_console`, `browser_cdp`, `browser_dialog`
**TTS:** `text_to_speech`
**Planning/Memory:** `todo`, `memory`, `session_search`
**Code Execution:** `execute_code`, `delegate_task`
**Cron:** `cronjob`
**Messaging:** `send_message`
**Computer Use:** `computer_use` (macOS, gated on CUA driver)

Toolsets are composable — `research`, `full_stack`, `web_only`, etc.

### 2. Browser Automation (CDP)
Uses `agent-browser` CLI wrapper around Chromium DevTools Protocol.
Key pattern:
```
navigate(url) → get accessibility tree (ariaSnapshot) → see elements as @e1, @e2...
click(@e5) → snapshot again → verify page changed
vision("what changed?") → screenshot + AI analysis
```

The accessibility tree makes it LLM-friendly — no vision needed to understand page layout.

### 3. Persistent Memory
- `memory` tool writes key-value pairs to local SQLite
- Injected into system prompt every turn
- `session_search` uses FTS5 for cross-session recall
- Separate USER.md (profile) and MEMORY.md (facts)

### 4. Cron Scheduler
- `cron/scheduler.py` — durable background scheduler
- Jobs run in isolated sessions with their own context
- Delivery via messaging platforms
- Per-job model/script/skills overrides

### 5. Curator (Skill Lifecycle)
- Background daemon that tracks skill usage
- Archives stale skills (>90 days idle)
- Prunes archived skills (>180 days)
- Never deletes — max action is archive
- Pinned skills exempt from auto-transitions

### 6. Skills System
- Skills are procedural knowledge loaded into session
- Auto-discovered from `~/.hermes/skills/`
- `skill_manage(patch)` for fixing outdated skills
- Categories: devops, data-science, creative, research, etc.

### 7. Provider System
- 20+ providers with API key or OAuth
- Credential pools for key rotation
- Provider-agnostic — swap mid-session
- Custom endpoint support

## What Codex Has Built-in vs What Needs Building
See [[codex-fork-native-capabilities]].

## Sandbox Architecture
See [[sandbox-isolation-architecture]].
