---
title: Codex Fork — Native Capabilities
created: 2026-05-24
updated: 2026-05-24
type: entity
tags: [codex, rust, runtime, tools, architecture]
confidence: high
---

# Codex Fork Native Capabilities

The bapX platform uses a forked Codex (OpenAI's open-source agent runtime written in Rust) as the agent engine inside each sandbox. Source at `bapX-src/`.

## Built-in ToolSpec Types (Rust enum)
Defined in `codex-rs/tools/src/tool_spec.rs`:

| Variant | Purpose | Built? |
|---------|---------|--------|
| `Function` | Standard function-calling tools | ✅ Yes |
| `Namespace` | Grouped tools (e.g. mcp, shell) | ✅ Yes |
| `ToolSearch` | Dynamic tool discovery | ✅ Yes |
| `ImageGeneration` | Generate images via API | ✅ Yes |
| `WebSearch` | Web search (cached/live) | ✅ Yes |
| `Freeform` | Custom freeform tools | ✅ Yes |

## Native Tool Runtimes
Defined in `codex-rs/core/src/tools/runtimes/`:
- `shell.rs` — bash execution
- `unified_exec.rs` — Python/Node execution
- `apply_patch.rs` — smart find-and-replace

## Tool Handlers
Defined in `codex-rs/core/src/tools/handlers/`:
- Shell (bash), apply_patch, agent_jobs (multi-agent)
- MCP tools + resources, extension tools
- Goal tracking, plan tracking
- Plugin install management, permissions
- User input requests, test sync
- Tool search, view image, dynamic tools

## Built-in Skills (Compiled Into Binary)
Installed at `$CODEX_HOME/skills/.system/` on first run:

| Skill | Description |
|-------|-------------|
| bapx-docs | Model/docs reference, prompting guide |
| imagegen | Image generation via DALL-E |
| plugin-creator | Scaffold plugins for marketplace |
| skill-creator | Create new skills (SKILL.md + scripts) |
| skill-installer | Install skills from GitHub |

## What Codex DOESN'T Have (Must Build)
- ❌ Browser automation (CDP/Playwright)
- ❌ Computer use for Linux
- ❌ Cron scheduler
- ❌ Full persistent memory (has SQLite `memories` table but no auto-injection)
- ❌ Skill curator/lifecycle management
- ❌ OCR tool
- ❌ Annotations on browser preview
- ❌ 28 bapX tools (pptx, pdf, notion, linear, deploy, etc.)
- ❌ Frontend dashboard integration

## Build Process
The Rust binary is compiled with Bazel. Source structure:
```
bapX-src/codex-rs/
  core/     — Agent runtime, tools, config
  tui/      — Terminal UI (ratatui)
  cli/      — CLI entry point
  skills/   — Skill system (compiled-in assets)
  app-server/ — App server for IDE integration
  tools/    — ToolSpec, Tool definitions
```

See [[hermes-agent-blueprint]] for what needs porting from Hermes.
