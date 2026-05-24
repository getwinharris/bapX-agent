# Codex TUI Architecture — Complete Component Tree & Layout

> Extracted from `/root/Dev/codex/codex-rs/tui/` — Rust-based Terminal UI (ratatui + crossterm)

## Overview

Codex CLI uses a **Rust terminal UI (TUI)** built on [ratatui](https://github.com/ratatui-org/ratatui) (v0.28+) with [crossterm](https://github.com/crossterm-rs/crossterm) backend. The single binary `codex` launches alternate-screen raw-mode terminal rendering. React/Ink is NOT used in the Rust TUI — the React/Ink reference from the task is legacy. The TUI is pure Rust.

### Technology Stack

| Layer | Library | Purpose |
|-|-|-|
| Terminal Backend | crossterm | Raw mode, alternate screen, events, OSC queries |
| Rendering | ratatui | Buffer-based widget rendering, layout system |
| Syntax Highlighting | syntect v5 + two_face v0.5 | ~250 languages, 32 bundled themes + custom `.tmTheme` |
| Markdown | pulldown-cmark | Event-based markdown parser |
| Table Detection | table_detect.rs | Heuristic table extraction from LLM output |
| Clipboard | arboard | Cross-platform clipboard (non-Android) |
| Image (Pets) | image crate + sixel + Kitty protocol | Sprite rendering via terminal image protocols |

### Binary Entry Point

`/root/Dev/codex/codex-rs/tui/src/main.rs` → `App::run()` in `app.rs`

---

## Layout Structure (Top-Down)

The TUI renders in a single-terminal full-screen layout organized as two main zones:

```
┌──────────────────────────────────┐
│   Transcript (Chat History)      │  ← scrollable, fills most of screen
│   - Agent messages               │
│   - User messages                │
│   - Diff renders                 │
│   - Status surfaces              │
│   - Exec cells (shell output)    │
│                                   │
├──────────────────────────────────┤
│   Status Indicator               │  ← animated spinner + elapsed time
│   (1 line when agent is busy)    │
├──────────────────────────────────┤
│   Chat Composer                  │  ← text input area
│   (multi-line textarea)          │
├──────────────────────────────────┤
│   Footer                         │  ← status line + key hints
│   (1-2 lines)                    │
└──────────────────────────────────┘
```

### Root Layout: `app.rs`

The `App` struct in `app.rs` owns the full application state machine. Key sub-structures:

- **`ChatWidget`** — manages the chat transcript, session state, agent interaction
- **`BottomPane`** — owns the composer, popups, footer
- **`StatusIndicatorWidget`** — animated "Working..." row
- **`OnboardingScreen`** — welcome/auth/trust flow before main UI
- **`Overlay`** — pager overlays for diffs and long output

### Pane Dimensions

- **Left gutter:** `LIVE_PREFIX_COLS = 2` columns reserved for prefix/border (ui_consts.rs)
- **Footer indent:** `FOOTER_INDENT_COLS = 2` (same as gutter)
- **Popup max rows:** `MAX_POPUP_ROWS = 8` (popup_consts.rs)
- **Min list width for side-by-side:** `MIN_LIST_WIDTH_FOR_SIDE = 40` columns

---

## Component Tree

### 1. Transcript Layer (`chatwidget/`)

The chat transcript rendering is managed by `ChatWidget` which owns:

```
ChatWidget
├── HistoryCell (history_cell/) — each message/event in transcript
│   ├── UserMessages — user input display
│   ├── AgentMessages — agent responses (markdown rendered)
│   ├── ExecCell (exec_cell/) — shell command output
│   │   ├── Model — exec state machine
│   │   └── Render — colored output with prefix
│   ├── DiffCell — file diff rendering
│   ├── ApprovalRequests — permission modals
│   ├── HookCells — webhook notifications
│   ├── McpCells — MCP tool call displays
│   ├── PlanCells — plan updates
│   ├── SessionHeaders — session boundary markers
│   └── SearchCells — web search results
├── SidePane (side.rs) — side conversation panel
├── Streaming Controller (streaming/) — live update scheduling
│   ├── Chunking — incremental render chunks
│   ├── CommitTick — periodic flush timer
│   ├── Controller — streaming state machine
│   └── TableHoldback — table render dedup
├── TurnRuntime (turn_runtime.rs) — agent turn lifecycle
├── ToolRequests (tool_requests.rs) — tool call management
├── StatusControls (status_controls.rs) — status surface interactions
└── StatusSurfaces (status_surfaces.rs) — rich status panels
```

#### History Cell Variants (history_cell/)

| Module | Purpose |
|-|-|
| `base.rs` | Base render traits for history cells |
| `messages.rs` | Agent/user message rendering |
| `exec.rs` | Command execution display |
| `patches.rs` | File patch display |
| `plans.rs` | Plan update rendering |
| `approvals.rs` | Approval request history |
| `mcp.rs` | MCP tool call display |
| `search.rs` | Web search results |
| `notices.rs` | System notices |
| `hook_cell.rs` | Webhook notifications |
| `session.rs` | Session boundary headers |
| `separators.rs` | Visual separators |
| `request_user_input.rs` | User input requests |

### 2. Bottom Pane (`bottom_pane/`)

The bottom pane is the interactive footer region:

```
BottomPane
├── ChatComposer (chat_composer.rs) — multi-line text input
│   ├── TextArea — text editing widget
│   ├── ChatComposerHistory — ↑/↓ history navigation
│   ├── PasteBurst — paste handling for Windows
│   └── RemoteImageRows — [Image #N] attachment rows
├── BottomPaneView Stack — modal popups overlay
│   ├── ListSelectionView — generic selection lists
│   ├── ApprovalOverlay — permission approval modals
│   ├── RequestUserInputOverlay — user input prompts
│   ├── McpServerElicitationOverlay — MCP config forms
│   ├── AppLinkView — app:// link handlers
│   ├── FeedbackView — feedback submission
│   ├── HooksBrowserView — webhook browser
│   ├── SkillsToggleView — skill toggling
│   ├── MemoriesSettingsView — memory configuration
│   ├── CustomPromptView — /prompt command view
│   └── ... (many more)
├── StatusIndicatorWidget (status_indicator_widget.rs) — animated status row
├── Footer (footer.rs) — key hints + status line
│   ├── FooterMode — mode-based text (quit, instructions, shortcuts)
│   └── StatusLine — configurable `/statusline` items
└── Popup Constants (popup_consts.rs) — shared popup layout rules
```

#### Footer Architecture (footer.rs)

The footer has three rendering modes:

1. **Status Line** — configurable `/statusline` items: model, git branch, context, etc.
2. **Instructional Footer** — tells user what to do (quit confirm, shortcuts, queue hints)
3. **Contextual Footer** — ambient context when no instruction is needed

Footer layout adapts to terminal width with progressive collapse rules:
- Full left-side hint + right-side context
- Drop right-side context before dropping queue hints
- Shorten queue hint text before removing it entirely
- Fall back to mode-only line, then no footer

Status line segments are separated by ` · ` (dimmed middle dot).

### 3. Diff Renderer (`diff_render.rs`)

Renders unified diffs with:

- **Line numbers** (right-aligned)
- **Gutter signs** (`+`/`-`/` `)
- **Syntax highlighting** via syntect
- **Theme-aware backgrounds**:
  - Dark: muted green `#213A2B` (add), muted red `#4A221D` (delete)
  - Light: GitHub-style `#dafbe1` (add), `#ffebe9` (delete)
  - Gutter: `#aceebb` (add num light), `#ffcecb` (del num light)
  - ANSI-256: indexed colors 22 (dark add), 52 (dark del), 194 (light add), 224 (light del)
- Coverage for `markup.inserted`/`markup.deleted` scopes from syntax themes

### 4. Onboarding Screen (`onboarding/`)

Multi-step startup flow:

```
OnboardingScreen
├── Step::Welcome (welcome.rs) — animated ASCII art + "Welcome to Codex"
├── Step::Auth (auth.rs) — login flow
│   ├── ChatGPT login
│   ├── Device code login
│   └── API key entry
└── Step::TrustDirectory (trust_directory.rs) — directory trust prompt
```

Welcome screen shows ASCII animations (36 frames per variant, 10 variants) from `/frames/` dir.

### 5. Theme Picker (`theme_picker.rs`)

Syntax theme selection dialog with:
- Live preview (Wide: side-by-side diff preview, Narrow: compact 4-line snippet)
- Cancel-restore on Esc
- Persists `[tui] theme = "..."` to config.toml

### 6. Terminal Pets (`pets/`)

Ambient sprites rendered via terminal image protocols (Sixel, Kitty):

| Pet ID | Display Name | Description |
|-|-|-|
| `codex` | Codex | The original Codex companion |
| `dewey` | Dewey | A tidy duck for calm workspace days |
| `fireball` | Fireball | Hot path energy for fast iteration |
| `rocky` | Rocky | A steady rock when the diff gets large |
| `seedy` | Seedy | Small green shoots for new ideas |
| `stacky` | Stacky | A balanced stack for deep work |
| `bsod` | BSOD | A tiny blue-screen gremlin |
| `null-signal` | Null Signal | Quiet signal from the void |

Spritesheet: 192×208 px per frame, 8 columns × 9 rows = 72 frames total.

---

## Styling Patterns

### Style Guide (`styles.md`)

| Element | Style |
|-|-|
| **Headers** | `bold` |
| **Primary text** | Default foreground |
| **Secondary text** | `dim` (ANSI dim modifier) |
| **User input tips, selection, status indicators** | ANSI `cyan` |
| **Success, additions** | ANSI `green` |
| **Errors, failures, deletions** | ANSI `red` |
| **Codex branding** | ANSI `magenta` |

**Avoid:** Custom RGB colors (no guarantee of contrast), ANSI `black`/`white` (terminal defaults are better), ANSI `blue`/`yellow` (not in guide).

### Adaptive Styling (`style.rs`)

- **Accent style:** `bold` + ANSI `Cyan` on dark backgrounds; `bold` + dark cyan `#005F87` (RGB: 0, 95, 135) on light backgrounds
- **User message background:** Semi-transparent overlay — black at 4% alpha (light terminals) or white at 12% alpha (dark terminals)
- **Status line colors:** Syntax-theme-aware with fallbacks:
  - Model/State/Metadata/Mode → cyan
  - Path/Usage/Progress → green  
  - Branch/Limit/Thread → magenta
- **Status line separator:** ` · ` (middle dot) with `dim` modifier
- **Status line softening:** RGB colors desaturated to 85% saturation, 100% brightness

### Diff Colors (dark theme)

| Context | Add Background | Del Background |
|-|-|-|
| **TrueColor** | `#213A2B` (33, 58, 43) | `#4A221D` (74, 34, 29) |
| **ANSI-256** | Index 22 (DarkGreen) | Index 52 (DarkRed) |
| **ANSI-16** | Foreground-only (green) | Foreground-only (red) |

### Diff Colors (light theme)

| Context | Add Background | Del Background |
|-|-|-|
| **TrueColor** | `#dafbe1` (218, 251, 225) | `#ffebe9` (255, 235, 233) |
| **ANSI-256** | Index 194 (Honeydew2) | Index 224 (MistyRose1) |
| **Gutter (line nums)** | `#aceebb` (172, 238, 187) | `#ffcecb` (255, 206, 203) |
| **Gutter foreground** | `#1f2328` (31, 35, 40) | |

### Selection Lists (`selection_list.rs`)

- **Selected item:** `› N. label` with cyan styling
- **Unselected item:** `  N. label` with default styling
- **Dimmed item:** `  N. label` with dim modifier

### Motion & Animation (`motion.rs`, `shimmer.rs`)

Two modes: `Animated` and `Reduced`

- **Shimmer effect:** Time-based sweep (2s period) across text characters, blending between default fg and bg colors
- **Activity indicator:** TrueColor → animated shimmer dot; otherwise → blink "•" / "◦" at 600ms intervals
- **Reduced motion:** Static bullet `•` dimmed, or hidden entirely
- **ASCII Animations:** 10 variants (default, codex, openai, blocks, dots, hash, hbars, vbars, shapes, slug), each 36 frames at 80ms per frame
- **Frame rate limit:** `TARGET_FRAME_INTERVAL` in frame_rate_limiter.rs

---

## Input Routing

```
Terminal Events (crossterm)
    │
    ▼
Tui (tui.rs) — event stream, frame scheduling
    │
    ▼
OnboardingScreen → bottom_pane → ChatComposer
    │                        └── popup views (Esc dismisses)
    ▼
ChatWidget — routes unhandled events to action handlers
    │
    ▼
App — interprets global actions (interrupt, quit, backtrack)
```

Key bindings are fully remappable via `keymap_setup/`.

---

## Popup System (`bottom_pane/bottom_pane_view.rs`)

Popups are stacked transient views that replace the composer:

- Max 8 rows (`MAX_POPUP_ROWS`)
- Side-by-side layout activates when list ≥ 40 cols and side panel ≥ 44 cols
- Standard hint: `Press Enter to confirm or Esc to go back`
- Menu surface horizontal inset: 4 columns (2 per side)
- Side content options: Fixed(N) columns or 50/50 split

---

## Code Organization (`/root/Dev/codex/codex-rs/tui/src/`)

| Module | Purpose |
|-|-|
| `app.rs` | Main application state machine and run loop |
| `app_event.rs` | Event types for state transitions |
| `app_command.rs` | Action commands dispatched through the app |
| `chatwidget/` | Chat transcript, agent interaction, streaming |
| `bottom_pane/` | Composer, footer, popups, overlays |
| `history_cell/` | Individual message/cell rendering in transcript |
| `exec_cell/` | Shell command output display |
| `diff_render.rs` | Unified diff rendering |
| `markdown.rs` | Markdown parsing pipeline |
| `markdown_render.rs` | Low-level markdown → ratatui widgets |
| `render/` | Highlighting, line utils, renderable traits |
| `style.rs` | Adaptive styles based on terminal background |
| `color.rs` | Color utilities (blend, perceptual distance) |
| `terminal_palette.rs` | Terminal color detection, XTERM_COLORS table |
| `ui_consts.rs` | Layout constants (prefix cols, footer indent) |
| `frames.rs` | ASCII animation frame embeds (10 variants × 36 frames) |
| `motion.rs` | Animated/reduced motion primitives |
| `shimmer.rs` | Time-based shimmer sweep effect |
| `themer_picker.rs` | Live syntax theme preview dialog |
| `onboarding/` | Welcome, auth, trust directory screens |
| `pets/` | Terminal pet sprites (sixel/kitty) |
| `keymap.rs` | Keybinding system |
| `keymap_setup/` | Keybinding customization UI |
| `tui.rs` | Terminal initialization, event loop, frame scheduling |
| `version.rs` | `CODEX_CLI_VERSION` from `CARGO_PKG_VERSION` |
| `wrapping.rs` | Word wrap with ratatui integration |
| `transcript_reflow.rs` | Transcript layout reflow on resize |
| `resume_picker.rs` | Session history browsing and resume |
| `status/` | Account status, rate limit display, format helpers |
| `selection_list.rs` | Selection list row rendering |
| `pager_overlay.rs` | Full-screen pager for diffs/long output |
| `external_editor.rs` | External $EDITOR integration |
| `voice.rs` | Voice input (non-Linux) |
