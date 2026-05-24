# Codex Brand Assets, Colors & CLI Identity

> Extracted from `/root/Dev/codex/` — splash image, CLI banners, color constants, desktop app identity

---

## Splash Image (`codex-cli-splash.png`)

**Location:** `/root/Dev/codex/.github/codex-cli-splash.png`
**Dimensions:** 1898 × 1190 px, 8-bit RGBA, PNG

The splash image depicts the Codex CLI in action inside a terminal emulator window. Key visual elements:

- **Window frame:** macOS-style terminal window with traffic light controls (red/yellow/green dots) in the title bar
- **Title bar:** Reads `codex — «your brilliant idea» — 80×24` simulating a real terminal session
- **Terminal content (dark theme):** The screen shows a Codex session with:
  - A welcome animation frame (ASCII art of a dragon-like creature)
  - The prompt `You` followed by user text asking Codex to build a feature
  - Codex's thinking/reasoning process displayed in dim text
  - Code blocks with syntax highlighting in the output
  - A status indicator with animated spinner at the bottom
- **Background:** Dark blurred gradient behind the terminal window
- **Color palette observed:** Dark terminal (#1e1e2e-ish), green text for code, cyan for status indicators, magenta accents for Codex branding

The splash represents the TUI experience — code editing, AI reasoning, and terminal interaction in one cohesive view.

---

## CLI Banner / Logo

The CLI uses `owo-colors` for colored terminal output. Key branding patterns found in:

### CLI Main Header (`cli/src/main.rs`)

The CLI `--help` banner reads:
```
Codex CLI
If no subcommand is specified, options will be forwarded to the interactive CLI.
```

Usage format:
```
codex [OPTIONS] [PROMPT]
codex [OPTIONS] <COMMAND> [ARGS]
```

### Doctor Command Branding (`cli/src/doctor/output.rs`)

The doctor report header:
```
Codex Doctor <version> [diagnostic info]
```

Uses `bold("Codex Doctor")` and `dim()` for metadata.

### Version Info (`tui/src/version.rs`)

Version embedded at compile time:
```rust
pub const CODEX_CLI_VERSION: &str = env!("CARGO_PKG_VERSION");
```

The Cargo.toml version is inherited from workspace root.

---

## Brand Colors

### Core Brand Palette

| Color | ANSI Code | Usage | Context |
|-|-|-|-|
| **Magenta** | ANSI `magenta` | Codex branding, agent names | `styles.md` — "Codex: Use ANSI magenta" |
| **Cyan** | ANSI `cyan` | Accent, selection, tips, status | `styles.md` — primary accent color |
| **Green** | ANSI `green` | Success, additions, status line paths | `styles.md` |
| **Red** | ANSI `red` | Errors, deletions, failures | `styles.md` |
| **Dim** | ANSI `dim` | Secondary text, separators, metadata | `styles.md` |

### Accent Colors (Adaptive)

| Context | Dark Terminal | Light Terminal |
|-|-|-|
| **Active/Selected** | `bold` + ANSI Cyan | `bold` + RGB(0, 95, 135) `#005F87` |
| **Status line accent** | ANSI Cyan (model/state/mode) | Same |
| **Status line path** | ANSI Green | Same |
| **Status line branch** | ANSI Magenta | Same |

### Diff Theme Colors (TrueColor)

| Context | Dark Theme | Light Theme |
|-|-|-|
| **Add background** | `#213A2B` (33, 58, 43) | `#dafbe1` (218, 251, 225) |
| **Delete background** | `#4A221D` (74, 34, 29) | `#ffebe9` (255, 235, 233) |
| **Add gutter bg** | — | `#aceebb` (172, 238, 187) |
| **Delete gutter bg** | — | `#ffcecb` (255, 206, 203) |
| **Gutter fg** | — | `#1f2328` (31, 35, 40) |

### Diff Theme Colors (ANSI-256)

| Context | Dark Index | Light Index | Light RGB |
|-|-|-|-|
| **Add background** | 22 (DarkGreen) | 194 (Honeydew2) | `#dafbe1` |
| **Delete background** | 52 (DarkRed) | 224 (MistyRose1) | `#ffebe9` |

### ANSI-16 Mode

Diff uses **foreground-only** styling (green for add, red for delete) — no background colors to avoid clashing with terminal palette.

### Status Line Style Fallbacks

| Segment Category | Fallback Color |
|-|-|
| Model, State, Metadata, Mode | `cyan()` |
| Path, Usage, Progress | `green()` |
| Branch, Limit, Thread | `magenta()` |

When theme colors are enabled, colors come from syntax theme scopes (softened to 85% saturation). When disabled, all segments use `dim()` only.

---

## ASCII Animations

### Animation System (`frames.rs` + `ascii_animation.rs`)

10 animation variants, each with 36 frames of ASCII art displayed at 80ms intervals:

| Variant | Description | Frame Style |
|-|-|-|
| `default` | A creature/dragon — uses `_=/*\+|~` etc. | ASCII line art |
| `codex` | Codex-branded — uses `eoedcdx` letters | Letter-based ASCII art |
| `openai` | OpenAI-branded — uses `aeanpio` letters | Letter-based ASCII art |
| `blocks` | Block characters — uses `▓▒░█` | Unicode block chars |
| `dots` | Dot-based — uses `.oO0@` | Progress dot animation |
| `hash` | Hash-based — uses `#` varying density | Hash pattern animation |
| `hbars` | Horizontal bar chart animation | Bar width varies |
| `vbars` | Vertical bar animation | Column height varies |
| `shapes` | Shape morphing — uses `*o+` | Circular animation |
| `slug` | Slug/Bug-like — uses `dgotp5` minichars | Letter-based ASCII art |

Each frame is 16 lines of text embedded at compile time via `include_str!()`.

---

## Desktop App Identity

### macOS Desktop App (`cli/src/desktop_app/mac.rs`)

- **App bundle name:** `Codex.app`
- **Install locations:** `/Applications/Codex.app` or `~/Applications/Codex.app`
- **DMG Download URLs:**
  - Apple Silicon (ARM64): `https://persistent.oaistatic.com/codex-app-prod/Codex.dmg`
  - Intel (x64): `https://persistent.oaistatic.com/codex-app-prod/Codex-latest-x64.dmg`
- **Install command:** `ditto` for `.app` bundle copy
- **Launch command:** `open -a <app_path> <workspace_path>`

### CLI Integration (`cli/src/app_cmd.rs`)

The `codex app [PATH]` CLI command:
- Opens the Codex Desktop app to a workspace
- Defaults to current directory (`.`)
- Downloads and installs the DMG if Codex.app isn't found
- Supports `--download-url` override for custom installers

---

## Terminal Pet Sprites (`pets/`)

### Sprite Sheet Specifications

| Property | Value |
|-|-|
| Frame width | 192 px |
| Frame height | 208 px |
| Columns per sheet | 8 |
| Rows per sheet | 9 |
| Total frames | 72 |
| Spritesheet size | 1536 × 1872 px |
| File format | WebP (e.g., `codex-spritesheet-v4.webp`) |

### Pet Catalog

| Pet ID | Display Name | Description | Spritesheet |
|-|-|-|-|
| `codex` | Codex | The original Codex companion | `codex-spritesheet-v4.webp` |
| `dewey` | Dewey | A tidy duck for calm workspace days | `dewey-spritesheet-v4.webp` |
| `fireball` | Fireball | Hot path energy for fast iteration | `fireball-spritesheet-v4.webp` |
| `rocky` | Rocky | A steady rock when the diff gets large | `rocky-spritesheet-v4.webp` |
| `seedy` | Seedy | Small green shoots for new ideas | `seedy-spritesheet-v4.webp` |
| `stacky` | Stacky | A balanced stack for deep work | `stacky-spritesheet-v4.webp` |
| `bsod` | BSOD | A tiny blue-screen gremlin | `bsod-spritesheet-v4.webp` |
| `null-signal` | Null Signal | Quiet signal from the void | `null-signal-spritesheet-v4.webp` |

Default pet: `codex`. Disabled pet sentinel: `disabled`.
Pets are user-customizable via `/pets` slash command within the TUI.

### Image Protocols Supported

- **Sixel** — standard sixel graphics (DEC)
- **Kitty** — Kitty terminal image protocol (via `image_protocol.rs`)
- **iTerm2** — inline images via OSC sequences

---

## Xterm Color Reference (`terminal_palette.rs`)

The TUI uses the full 256 xterm color table for fallback rendering. First 16 colors are system-dependent (terminal theme); indices 16-255 are consistent across terminals.

Key branded indices used:
- Index 22 = DarkGreen (dark diff add background)
- Index 52 = DarkRed (dark diff del background)
- Index 194 = Honeydew2 (light diff add background)
- Index 224 = MistyRose1 (light diff del background)

---

## Config Persistence

### Theme Selection

Syntax theme persisted to config:
```toml
[tui]
theme = "theme-name"  # .tmTheme name or bundled theme
```

Custom `.tmTheme` files loaded from `$CODEX_HOME/themes/`.

### Status Line Configuration

Configurable via `/statusline` command; items include: ModelName, CurrentDir, GitBranch, ContextRemaining, UsedTokens, CodexVersion, SessionId, FastMode, RawOutput, Permissions, ApprovalMode, ThreadTitle, TaskProgress, etc.

### Pet Selection

Persisted via config; built-in pets fetched from OpenAI CDN and cached under `$CODEX_HOME/pets/`.

---

## Key UI Text Patterns

### Welcome Screen
```
  Welcome to **Codex**, OpenAI's command-line coding agent
```

### Standard Popup Hints
```
Press Enter to confirm or Esc to go back
```

### Status Line Separator
```
model-name · /current/dir · main-branch
  ↑ dim(" · ")
```

### Animated Status Row
```
Working [•••] (12s • Esc to interrupt)
  └ details: running build...
```

Where `•••` is a shimmer-animated activity indicator.
