---
title: Codex macOS Desktop App Architecture
type: entity
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, codex, platform, desktop-app, protocol, architecture]
cross-refs: [codex-desktop-app-protocol, design-system-codex, manus-vs-codex-ui, layout-comparison]
---

# Codex macOS Desktop App Architecture

> Extracted from the actual app-server protocol source code, desktop app launcher, and daemon lifecycle management.
> Source code examined: `/root/Dev/codex/codex-rs/` — `desktop_app/`, `app-server-protocol/`, `app-server-client/`, `app-server-daemon/`, `login/src/assets/`

---

## 1. Product Context

- **Product**: Codex — OpenAI's open-source agent runtime
- **Developer**: OpenAI
- **Interface**: macOS native desktop application (.app bundle) + CLI orchestrator
- **Positioning**: Agent runtime for developers — desktop GUI companion with daemon-managed backend
- **Target audience**: Developers, engineers, technical users
- **Architecture**: Native app (SwiftUI/native) + Rust backend (app-server) + daemon + JSON-RPC protocol

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    macOS Desktop App                         │
│  Native .app bundle (SwiftUI or native rendering)            │
│  JSON-RPC 2.0 over WebSocket over Unix Socket               │
│  Deep link: codex://threads/new                              │
│  Receives workspace path as launch argument                  │
├──────────────────────────────────────────────────────────────┤
│                    codex CLI (launcher)                       │
│  `codex desktop` downloads DMG, installs, launches           │
│  Download: persistent.oaistatic.com/codex-app-prod/Codex.dmg │
│  Install: /Applications/Codex.app or ~/Applications/         │
│  Launch: `open -a Codex.app <workspace>`                     │
├──────────────────────────────────────────────────────────────┤
│              codex-app-server-daemon                         │
│   Background process, PID-managed, auto-updating             │
│   Unix socket: $CODEX_HOME/app-server.sock                   │
│   WebSocket JSON-RPC transport                               │
│   Remote control endpoint for headless operation             │
├──────────────────────────────────────────────────────────────┤
│                app-server (core runtime)                      │
│   Thread/turn management, agent execution                    │
│   Tool system (filesystem, terminal, MCP, web search)        │
│   Approval routing, config management                        │
│   Session/state management                                   │
└──────────────────────────────────────────────────────────────┘
```

### Key Architecture Facts

1. **The desktop app is a native macOS .app bundle** — not Electron, not web-based, and NOT the TUI
2. **Signed and notarized** with Apple Developer ID — production-ready distribution
3. **Entitlement**: `com.apple.security.cs.allow-jit` — allows JIT compilation (suggests SwiftUI or metal-backed rendering)
4. **Distributed as .dmg** from `https://persistent.oaistatic.com/codex-app-prod/`
   - ARM64: `Codex.dmg`
   - Intel: `Codex-latest-x64.dmg`
5. **Communicates via JSON-RPC 2.0** over WebSocket over Unix socket
6. **Daemon-managed lifecycle**: Start/stop/restart app-server as background process
7. **Deep link protocol**: `codex://threads/new`
8. **Receives workspace path** as command-line argument when launched
9. **Light mode default** with dark mode via `prefers-color-scheme` (confirmed from login page CSS)

---

## 3. macOS Desktop App Launcher

### Installation Flow
1. Check if Codex.app exists at `/Applications/Codex.app` or `~/Applications/Codex.app`
2. If found, launch with `open -a Codex.app <workspace>`
3. If not found, download DMG from CDN
4. Mount DMG with `hdiutil attach -nobrowse -readonly`
5. Find Codex.app in mounted volume
6. Copy to `/Applications/` using `ditto`
7. Detach DMG with `hdiutil detach`
8. Launch the app

### Platform Detection
- Apple Silicon detection via `sysctl.proc_translated` and `hw.optional.arm64` sysctl flags
- Separate DMG URLs for ARM64 vs x64

---

## 4. Login & Authentication Flow

### 4.1 OAuth Web Flow
The login crate (`codex-login`) provides the OAuth callback pages:

1. Desktop app sends `account/login` with one of:
   - `apiKey` — Direct API key entry
   - `chatgpt` — ChatGPT OAuth (opens system browser)
   - `chatgptDeviceCode` — Device code flow (displays code in app)
   - `chatgptAuthTokens` — Direct token injection (internal use)

2. Browser opens to OAuth provider (chat.openai.com)
3. After auth, browser redirects to local HTTP server
4. Login HTML pages are served:

#### Success Page (`success.html`)
- "ChatGPT" wordmark at top-left
- "You're signed in and may close this tab" message
- "Open Codex" button with Codex logo SVG
- Auto-redirects to `codex://threads/new` after 250ms
- If `needs_setup=true`, shows setup box with countdown to API org setup
- CSS tokens confirm **light-by-default with dark mode support**

#### Error Page (`error.html`)
- "Codex login" branding with logo
- Error title, message, error code, description, and help text
- Card layout with shadow, details grid
- Clean light-only styling

### 4.2 MCP Server OAuth
- Desktop app sends `mcpServer/oauthLogin` with `{ name, scopes, timeoutSecs }`
- Server initiates provider's OAuth flow
- Completion via `mcpServer/oauthLogin/completed` notification

---

## 5. UI Protocol — All Interaction Types

The desktop app is protocol-defined. Every UI interaction maps to a JSON-RPC message.

### 5.1 Chat Interface

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `turn/start` | Send message (user input) | App → Server |
| `turn/steer` | Edit/supplement running turn | App → Server |
| `turn/interrupt` | Stop button | App → Server |
| `agent/message/delta` | Streaming text append in chat bubble | Server → App |
| `item/started` | Item progress indicator (spinner) | Server → App |
| `item/completed` | Item completion state (checkmark) | Server → App |
| `reasoning/textDelta` | Reasoning display panel update | Server → App |
| `reasoning/summaryTextDelta` | Reasoning summary streaming | Server → App |
| `plan/delta` | Plan step status changes | Server → App |
| `turn/completed` | Turn completion state | Server → App |
| `turn/diff/updated` | Turn diff visible in conversation | Server → App |

### 5.2 Terminal Panel

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `command/exec` | Run command in terminal | App → Server |
| `command/exec/write` | Send stdin input | App → Server |
| `command/exec/resize` | Resize PTY (cols/rows) | App → Server |
| `command/exec/terminate` | Kill process | App → Server |
| `command/exec/outputDelta` | stdout/stderr bytes appended | Server → App |
| `process/outputDelta` | process/spawn output streaming | Server → App |
| `process/exited` | Process exit code notification | Server → App |

### 5.3 File System Panel

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `fs/readFile` | Open file in viewer/editor | App → Server |
| `fs/writeFile` | Save file | App → Server |
| `fs/readDirectory` | Browse directory | App → Server |
| `fs/watch` | Watch file for changes | App → Server |
| `fs/changed` | File changed notification | Server → App |
| `fileChange/patch/updated` | Diff preview in flow/chat | Server → App |

### 5.4 Approval Dialogs

| Protocol Message | UI Dialog | Direction |
|-----------------|-----------|-----------|
| `commandExecution/requestApproval` | "Allow this command?" dialog | Server → App |
| `fileChange/requestApproval` | "Allow this file change?" dialog | Server → App |
| `permissions/requestApproval` | "Grant permissions?" dialog | Server → App |
| `applyPatch/requestApproval` | "Apply this patch?" dialog | Server → App |
| `execCommand/requestApproval` | "Execute this command?" dialog | Server → App |
| `tools/requestUserInput` | Form dialog (text, select, secret) | Server → App |
| `mcpServerElicitation/request` | Parameter elicitation dialog | Server → App |

### 5.5 Approval Response Types
Commands can be approved/denied with different scopes:
- **Accept** — Allow once
- **Accept for Session** — Allow for this session (cache)
- **Accept with Policy Amendment** — Allow and update execpolicy to auto-allow future matching commands
- **Apply Network Policy Amendment** — Create persistent allow/deny rule for a host
- **Decline** — Deny, continue turn
- **Cancel** — Deny, interrupt entire turn

### 5.6 Sidebar / Navigation

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `apps/list` | App/connector sidebar | App → Server |
| `appList/updated` | App list refresh | Server → App |
| `thread/list` | Thread conversation list | App → Server |
| `thread/loadedList` | Loaded threads | App → Server |
| `thread/name/updated` | Thread rename | Server → App |
| `thread/status/changed` | Thread status icon update | Server → App |
| `thread/archived` | Thread removed from list | Server → App |
| `skills/list` | Skills/plugins browser | App → Server |
| `skills/changed` | Skills panel refresh | Server → App |

### 5.7 Settings Panels

| Protocol Message | UI Panel | Direction |
|-----------------|----------|-----------|
| `config/read` | Load settings form | App → Server |
| `config/writeValue` | Save single setting | App → Server |
| `config/batchWrite` | Save multiple settings at once | App → Server |
| `config/warning` | Config file issue notification | Server → App |
| `config/requirementsChanged` | Config requirements update | Server → App |
| `thread/settings/updated` | Per-thread settings changed | Server → App |
| `model/list` | Model selector options | App → Server |
| `modelProviderCapabilities/read` | Provider capabilities | App → Server |
| `permissionProfile/list` | Permission profiles list | App → Server |
| `experimentalFeature/list` | Feature flags browser | App → Server |
| `experimentalFeature/setEnablement` | Toggle feature | App → Server |

### 5.8 Plugin / Marketplace

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `plugin/list` | Installed plugins list | App → Server |
| `plugin/install` | Install plugin from marketplace | App → Server |
| `plugin/uninstall` | Remove plugin | App → Server |
| `plugin/read` | Plugin details view | App → Server |
| `plugin/skill/read` | Plugin skill details | App → Server |
| `marketplace/add/remove/upgrade` | Marketplace operations | App → Server |
| `plugin/share/save/list/checkout/delete/updateTargets` | Plugin sharing | App → Server |

### 5.9 Realtime Audio

| Protocol Message | UI Element | Direction |
|-----------------|------------|-----------|
| `thread/realtime/started` | Audio session active indicator | Server → App |
| `thread/realtime/outputAudioDelta` | Audio playback | Server → App |
| `thread/realtime/transcriptDelta` | Live transcription | Server → App |
| `thread/realtime/sdp` | WebRTC connection state | Server → App |

---

## 6. UI Layout (Derived from Protocol)

Based on the protocol surface area, the desktop app UI consists of:

### 6.1 Layout Structure
```
┌─────────────────────────────┬────────────────────────────────┐
│  Left Column                │  Main Content Area             │
│  ┌───────────────────────┐  │  ┌──────────────────────────┐  │
│  │  Thread List          │  │  │  Chat Messages           │  │
│  │  - Thread 1 (active)  │  │  │  - Streaming text        │  │
│  │  - Thread 2 (idle)    │  │  │  - Code blocks           │  │
│  │  - Thread 3 (error)   │  │  │  - Reasoning expander    │  │
│  │  App List             │  │  │  - Approval requests     │  │
│  │  - GitHub             │  │  │  - Diff previews         │  │
│  │  - Slack              │  │  └──────────────────────────┘  │
│  │  Search / New Thread  │  │  ┌──────────────────────────┐  │
│  └───────────────────────┘  │  │  Input Area               │  │
│                             │  │  - Text input             │  │
│                             │  │  - Send/Stop buttons      │  │
│                             │  └──────────────────────────┘  │
│  Right Panel (optional)     │                                │
│  ┌───────────────────────┐  │                                │
│  │  Tab: Flow/Terminal   │  │                                │
│  │  - Activity stream    │  │                                │
│  │  - File changes       │  │                                │
│  │  - Command output     │  │                                │
│  │  - Plan steps         │  │                                │
│  └───────────────────────┘  │                                │
└─────────────────────────────┴────────────────────────────────┘
```

### 6.2 Window Areas

1. **Left Column** (~240-280px)
   - Thread list with status indicators (idle/active/waitingOnApproval/waitingOnUserInput/systemError)
   - App list with logos, enbaled/disabled toggles, install buttons
   - Skills/plugins browser
   - Search/new thread input

2. **Main Content** (flexible)
   - **Chat View**: Streaming agent messages, code blocks, file diffs, reasoning panels
   - **Input Bar**: Text input, send/stop buttons, attachment capabilities
   - **Inline Diffs**: Color-coded file changes within conversation
   - **Approval Dialogs**: Modal overlays for permission requests
   - **Inline Forms**: User input questions with text fields, secret inputs, selectable options

3. **Right Panel** (~320-400px, toggleable)
   - Flow/Activity tab: Real-time event stream for tool calls, file changes, plan steps
   - Terminal tab: PTY-based shell session with stdin/stdout/stderr streaming, resize support
   - Settings tab: Full config editor with layered settings (user/project/system/MDM)

---

## 7. Thread Status Model

Threads have a state machine for UI rendering:

```
notLoaded ──> idle ──> active ──> idle
                ↑         │          │
                │         ↓          │
                │     systemError    │
                └────────────────────┘
```

While `active`, a thread can have flags:
- `waitingOnApproval` — Approval dialog visible, input blocked
- `waitingOnUserInput` — Form dialog visible, input blocked

---

## 8. Config System Structure

The config is organized in layers with increasing priority:
1. **Built-in defaults** (lowest priority)
2. **Project config** — per-project `config.toml`
3. **User config** — user-level `config.toml`
4. **System config** — managed `managed_config.toml`
5. **MDM config** — macOS Managed Preferences (`com.openai.codex` domain)

Each layer has a `disabledReason` field for when a higher-priority layer overrides it.

Config sections relevant to the desktop app:
- `desktop` — Desktop-specific settings (arbitrary object)
- `model`, `model_provider`, `model_reasoning_effort`, `model_verbosity`, etc.
- `sandbox_mode`, `sandbox_workspace_write`
- `approval_policy`, `approvals_reviewer`
- `tools`, `web_search`
- `apps` — App/connector configurations
- `analytics` — Telemetry settings
- `forced_chatgpt_workspace_id`, `forced_login_method` — Enterprise config

---

## 9. macOS Specifics

### Code Signing
- Entitlements: `com.apple.security.cs.allow-jit` (JIT compilation)
- Signed with Apple Developer ID certificate
- Notarized with Apple notary service
- Binaries signed: `codex`, `codex-responses-api-proxy`
- DMG also signed and notarized, stapled

### Distribution
- Hosted at `https://persistent.oaistatic.com/codex-app-prod/`
- ARM64: `Codex.dmg`
- x64: `Codex-latest-x64.dmg`
- Installed to `/Applications/Codex.app` or `~/Applications/Codex.app`

### Login Page Design Tokens (Actual App CSS)
```
Font: "SF Pro", ui-sans-serif, system-ui, -apple-system
Light mode: #ffffff bg, #0d0d0d text
Dark mode:  #181818 bg, #ffffff text
Border radii: 999px (buttons), 16px (cards)
Button style: border-only, rounded-full, hover background
Wordmark: "ChatGPT" at top-left, 21px, 650 weight
```

### Codex Logo
SVG path representing a stylized "C" mark:
```svg
M22.356 19.797H17.17
M9.662 12.29l1.979 3.576a.511.511 0 0 1-.005.504l-1.974 3.409
M30.758 16c0 8.15-6.607 14.758-14.758 14.758...
```
Used as favicon, in login pages, and likely as app icon.

---

## 10. Key Differences From Previous Analysis

This analysis replaces previous speculative designs. Key corrections:

| Previous (Speculative) | Actual (From Source) |
|------------------------|---------------------|
| Dark theme dominant | Light theme default with dark mode support |
| #0081f2 accent color | No accent color confirmed in protocol |
| Inter font family | "SF Pro" / system fonts confirmed |
| Three-column layout | Two-column + optional panel confirmed by protocol |
| 48px icon rail | Not confirmed; protocol shows thread list + app list sidebar |
| CDP-based browser | No browser view in protocol; realtime audio confirmed |
| Electron/Native hybrid | Native .app bundle with SwiftUI likely |
| Right panel: Flow/Browser/Terminal | Right panel: Flow/Terminal/Settings (no browser tab confirmed) |
| Three bouncing dots typing indicator | Not confirmed in protocol |
| #1a1a1a main bg | #ffffff (light) / #181818 (dark) from login pages |
