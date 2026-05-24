---
title: Codex Desktop App Protocol Analysis
type: raw
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [protocol, app-server, json-rpc, desktop-app]
cross-refs: [codex-macos, design-system-codex]
---

# Codex Desktop App Protocol Analysis

> Extracted from the `app-server-protocol` JSON schemas, `app-server-client` Rust crate, and `app-server-daemon` lifecycle management.
> Source: `/root/Dev/codex/codex-rs/app-server-protocol/schema/json/`

---

## 1. Transport Layer

The desktop app communicates with the app-server over **JSON-RPC 2.0 over WebSocket over Unix socket** (macOS/Linux) or TCP (Windows).

### Connection Flow
1. Client opens a Unix stream socket to `$CODEX_HOME/app-server.sock` (or platform equivalent)
2. Client upgrades to WebSocket via `ws://localhost/` handshake
3. Client sends `"initialize"` request with `ClientInfo` (name, title, version) and `InitializeCapabilities`
4. Server responds with `InitializeResponse` (server info, capabilities, version)
5. Client sends `"initialized"` notification (no params)
6. Bidirectional JSON-RPC commences

### Transport Types
```rust
pub enum AppServerClient {
    InProcess(InProcessAppServerClient),  // Same process, channel-based
    Remote(RemoteAppServerClient),        // Separate process, WebSocket on Unix socket
}
```

The **daemon** (`codex_app_server_daemon`) manages the remote app-server lifecycle:
- Start/stop/restart the app-server process
- Probe readiness via WebSocket initialize handshake
- PID file management at `$CODEX_HOME/app-server-daemon/`
- Auto-update loop via `update_loop.rs`

---

## 2. Message Types

### 2.1 ClientRequest — Desktop App → Server

All available request methods the desktop app can issue:

| Method | Description | UI Impact |
|--------|-------------|-----------|
| `account/login` | Log in (API key, ChatGPT OAuth, device code) | Login dialog/sheet |
| `account/logout` | Log out current account | Account menu |
| `account/get` | Get current account info | Profile display |
| `account/rateLimits` | Get rate limit status | Usage display |
| `account/cancelLogin` | Cancel in-progress login | Login sheet |
| `apps/list` | List available apps/connectors | App sidebar |
| `config/read` | Read current configuration | Settings panels |
| `config/writeValue` | Write single config value | Settings editors |
| `config/batchWrite` | Batch config edits | Settings panels |
| `config/requirements` | Get config requirements | Config UI |
| `experimentalFeature/list` | List experimental features | Feature toggles |
| `experimentalFeature/setEnablement` | Enable/disable features | Feature toggles |
| `fs/readFile` | Read file from host filesystem | File viewer |
| `fs/writeFile` | Write file to host filesystem | File editor |
| `fs/readDirectory` | List directory | File browser |
| `fs/getMetadata` | Get file metadata | File info |
| `fs/createDirectory` | Create directory | File ops |
| `fs/copy` | Copy file/directory | File ops |
| `fs/remove` | Remove file/directory | File ops |
| `fs/watch` | Watch file for changes | File watcher |
| `fs/unwatch` | Stop watching file | File watcher |
| `command/exec` | Execute a terminal command | Terminal panel |
| `command/exec/write` | Write stdin to running process | Terminal input |
| `command/exec/resize` | Resize PTY | Terminal resize |
| `command/exec/terminate` | Kill running process | Terminal kill |
| `marketplace/add` | Install marketplace item | Marketplace UI |
| `marketplace/remove` | Uninstall marketplace item | Marketplace UI |
| `marketplace/upgrade` | Upgrade marketplace item | Marketplace UI |
| `mcpServer/oauthLogin` | Initiate MCP OAuth login | OAuth dialog |
| `mcpServer/toolCall` | Make MCP tool call | MCP tool UI |
| `mcpServer/refresh` | Refresh MCP server connection | MCP status |
| `model/list` | List available models | Model selector |
| `modelProviderCapabilities/read` | Read provider capabilities | Provider settings |
| `permissionProfile/list` | List permission profiles | Permissions settings |
| `plugin/install` | Install plugin | Plugin UI |
| `plugin/uninstall` | Uninstall plugin | Plugin UI |
| `plugin/list` | List installed plugins | Plugin sidebar |
| `plugin/read` | Read plugin details | Plugin info |
| `plugin/skill/read` | Read plugin skill | Plugin skill viewer |
| `plugin/installCompleted` | Report install complete | Plugin install flow |
| `plugin/share/save` | Save plugin share | Plugin sharing |
| `plugin/share/list` | List plugin shares | Plugin sharing |
| `plugin/share/checkout` | Checkout plugin share | Plugin sharing |
| `plugin/share/delete` | Delete plugin share | Plugin sharing |
| `plugin/share/updateTargets` | Update share targets | Plugin sharing |
| `skills/list` | List available skills | Skills panel |
| `skillsConfig/write` | Write skills configuration | Skills settings |
| `thread/start` | Start new thread | New chat |
| `thread/resume` | Resume existing thread | Thread list |
| `thread/read` | Read thread content | Thread history |
| `thread/list` | List threads | Thread sidebar |
| `thread/loadedList` | List loaded threads | Thread management |
| `thread/archive` | Archive thread | Thread list |
| `thread/unarchive` | Unarchive thread | Thread list |
| `thread/fork` | Fork a thread | Thread branching |
| `thread/setName` | Rename thread | Rename dialog |
| `thread/metadataUpdate` | Update thread metadata | Thread info |
| `thread/rollback` | Rollback thread | Thread history |
| `thread/goal/set` | Set thread goal | Goal input |
| `thread/goal/get` | Get current goal | Goal display |
| `thread/goal/clear` | Clear goal | Goal display |
| `thread/injectItems` | Inject items into thread | Manual context |
| `thread/compact/start` | Start context compaction | Compaction UI |
| `thread/subscribe` | Subscribe to thread events | Event stream |
| `thread/unsubscribe` | Unsubscribe from thread | Event stream |
| `thread/approveGuardianDeniedAction` | Override guardian denial | Guardian override |
| `turn/start` | Start new turn (send message) | Chat send |
| `turn/steer` | Steer running turn | Chat steer |
| `turn/interrupt` | Interrupt running turn | Stop button |
| `turn/environment` | Get turn environment | Environment info |
| `review/start` | Start code review session | Review UI |
| `sendAddCreditsNudgeEmail` | Send credit nudge email | Billing |
| `hooks/list` | List hooks | Hooks manager |
| `externalAgentConfig/detect` | Detect external agent config | Migration wizard |
| `externalAgentConfig/import` | Import external config | Migration wizard |
| `feedback/upload` | Upload feedback | Feedback dialog |
| `tools/requestUserInput` | Submit user input response | Input dialog |

### 2.2 ServerNotification — Server → Desktop App

Notifications pushed from server to desktop app:

| Method | Description | UI Rendering |
|--------|-------------|--------------|
| `account/loginCompleted` | Login flow result | Login sheet result |
| `account/updated` | Account info changed | Profile/settings update |
| `account/rateLimits/updated` | Rate limits changed | Usage indicator |
| `agent/message/delta` | Streaming agent message text | Chat message streaming |
| `appList/updated` | App list changed | App sidebar refresh |
| `command/exec/outputDelta` | Terminal stdout/stderr chunk | Terminal panel output |
| `config/warning` | Config file issues | Warning toast/badge |
| `config/requirementsChanged` | Config requirements changed | Settings update |
| `context/compacted` | Context was compacted | Compaction notification |
| `deprecationNotice` | Deprecation warning | Notice banner |
| `error` | Server error | Error display |
| `fileChange/patch/updated` | File change diff notification | Diff display in chat/flow |
| `fileChange/outputDelta` | File change streaming output | Progress indicator |
| `fs/changed` | Watched file changed | File watcher event |
| `guardian/warning` | Guardian policy warning | Warning notification |
| `hook/completed` | Hook execution finished | Hook status |
| `hook/started` | Hook execution started | Hook status |
| `item/completed` | Thread item completed | Item completion state |
| `item/started` | Thread item started | Item progress |
| `item/guardianApprovalReview/started` | Guardian review begun | Guardian UI |
| `item/guardianApprovalReview/completed` | Guardian review done | Guardian UI |
| `mcpServer/oauthLogin/completed` | MCP OAuth login done | OAuth status |
| `mcpServer/status/updated` | MCP server status changed | MCP status indicator |
| `mcp/toolCall/progress` | MCP tool call progress | Progress indicator |
| `model/rerouted` | Model was rerouted | Model indicator |
| `model/verification` | Model verification event | Verification UI |
| `plan/delta` | Plan step changed | Plan panel update |
| `process/exited` | Process exited | Terminal panel state |
| `process/outputDelta` | Process stdout/stderr chunk | Process output |
| `reasoning/textDelta` | Reasoning text streaming | Reasoning panel |
| `reasoning/summaryTextDelta` | Reasoning summary streaming | Reasoning summary |
| `reasoning/summaryPartAdded` | New reasoning summary part | Reasoning part |
| `remoteControl/statusChanged` | Remote control status | Remote control UI |
| `serverRequest/resolved` | Server request resolved | Request status |
| `skills/changed` | Skills configuration changed | Skills panel refresh |
| `terminal/interaction` | Terminal I/O event | Terminal highlight |
| `thread/archived` | Thread was archived | Thread list update |
| `thread/closed` | Thread was closed | Thread state |
| `thread/goal/cleared` | Goal cleared | Goal display |
| `thread/goal/updated` | Goal updated | Goal display |
| `thread/name/updated` | Thread renamed | Thread list update |
| `thread/started` | New thread created | Thread view |
| `thread/status/changed` | Thread status changed | Status indicator |
| `thread/settings/updated` | Thread settings changed | Settings panel |
| `thread/realtime/started` | Realtime session started | Audio indicator |
| `thread/realtime/closed` | Realtime session ended | Audio indicator |
| `thread/realtime/error` | Realtime session error | Audio error |
| `thread/realtime/itemAdded` | New item from realtime | Chat update |
| `thread/realtime/transcriptDelta` | Realtime transcript chunk | Transcript display |
| `thread/realtime/transcriptDone` | Realtime transcript done | Transcript complete |
| `thread/realtime/outputAudioDelta` | Realtime audio output | Audio playback |
| `thread/realtime/sdp` | WebRTC SDP exchange | Connection state |
| `turn/completed` | Turn finished | Turn state |
| `turn/started` | Turn started | Turn state |
| `turn/diff/updated` | Turn diff updated | Diff display |
| `turn/plan/updated` | Turn plan updated | Plan panel |

### 2.3 ServerRequest — Server Requests Desktop App Action

Server-initiated requests that the desktop app must respond to:

| Method | UI Component | Interaction |
|--------|-------------|-------------|
| `commandExecution/requestApproval` | Approval dialog — command execution | User approves/denies command |
| `fileChange/requestApproval` | Approval dialog — file change | User approves/denies edits |
| `permissions/requestApproval` | Approval dialog — permissions | User grants/denies permissions |
| `applyPatch/requestApproval` | Approval dialog — patch apply | User approves patch |
| `execCommand/requestApproval` | Approval dialog — exec command | User approves exec |
| `tools/requestUserInput` | Input dialog — questions | User fills form/selects options |
| `mcpServerElicitation/request` | Elicitation dialog — MCP params | User provides MCP parameters |

---

## 3. Approval Dialog Types

The approval system is the most UI-intensive part of the protocol. There are 5 distinct approval request types:

### 3.1 Command Execution Approval
```json
{
  "cwd": "/Users/user/project",
  "itemId": "item_123",
  "commandAction": { "type": "read", "command": "cat", "name": "cat", "path": "/file" },
  "additionalPermissions": { /* fileSystem or network overlay */ },
  "startedAtMs": 1718000000000,
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Dialog showing the command text, detected action type (read, search, listFiles, unknown), requested file permissions, network access, with buttons: **Accept**, **Accept for Session**, **Accept with Policy Amendment**, **Decline**, **Cancel Turn**

### 3.2 File Change Approval
```json
{
  "itemId": "item_123",
  "reason": "Request for extra write access",
  "grantRoot": "/Users/user/project/src",
  "startedAtMs": 1718000000000,
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Dialog showing file paths being modified, diff preview, grant root request, with Approve/Deny buttons

### 3.3 Permissions Request Approval
```json
{
  "cwd": "/Users/user/project",
  "itemId": "item_123",
  "permissions": {
    "fileSystem": { "entries": [{"access": "write", "path": ...}] },
    "network": { "enabled": true }
  },
  "reason": "Need to install npm packages",
  "startedAtMs": 1718000000000,
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Dialog showing requested filesystem paths (with access modes) and network access, with granular approval for each dimension

### 3.4 Apply Patch Approval
```json
{
  "callId": "patch_call_1",
  "conversationId": "thread_456",
  "fileChanges": { "path/to/file.ts": { /* add/delete/update */ } }
}
```
UI: Dialog showing file diff for each changed file, with add/delete/update indicators

### 3.5 Tool Request User Input
```json
{
  "itemId": "item_123",
  "questions": [
    {
      "id": "q1",
      "header": "API Configuration",
      "question": "What is your API key?",
      "isSecret": true,
      "options": [{ "label": "Use existing", "description": "..." }]
    }
  ],
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Form dialog with text inputs, secret fields (masked), selectable options, multi-select

---

## 4. Streaming UI Components

### 4.1 Agent Message Streaming
```json
// AgentMessageDeltaNotification
{
  "delta": "The agent is generating...",
  "itemId": "item_123",
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Real-time chat text append as the agent generates

### 4.2 Terminal Output Streaming
```json
// CommandExecOutputDeltaNotification
{
  "processId": "proc_123",
  "stream": "stdout",  // or "stderr"
  "deltaBase64": "bG9yZW0gaXBzdW0=",
  "capReached": false
}
```
UI: Base64-decoded bytes appended to terminal panel, with stream differentiation (stdout vs stderr vs combined PTY mode)

### 4.3 File Change Diff Streaming
```json
// FileChangePatchUpdatedNotification
{
  "threadId": "thread_456",
  "turnId": "turn_789",
  "itemId": "item_123",
  "changes": [
    {
      "path": "/Users/user/project/src/main.ts",
      "kind": { "type": "update" },
      "diff": "@@ -1,5 +1,7 @@\n..."
    }
  ]
}
```
UI: Real-time diff display in chat or flow panel, with color-coded additions/deletions

### 4.4 Context Compaction
```json
// ContextCompactedNotification
{
  "threadId": "thread_456",
  "turnId": "turn_789"
}
```
UI: Notification toast or banner — "Context compacted" with option to view summary

### 4.5 Plan Delta
```json
// PlanDeltaNotification
{
  "threadId": "thread_456",
  "turnId": "turn_789",
  "plan": { /* plan steps */ }
}
```
UI: Plan panel updates showing completed/in-progress/pending steps, step descriptions

---

## 5. UI Panel Data Types

### 5.1 Thread List
```json
// ThreadListResponse
{
  "threads": [
    {
      "id": "thread_123",
      "name": "Fix login bug",
      "status": { "type": "active", "activeFlags": [] },
      "createdAt": "...",
      "updatedAt": "...",
      "tokenUsage": { /* ... */ },
      "model": "o3-mini",
      "source": { "kind": "composer" }
    }
  ]
}
```
UI: Sidebar list with thread name, status indicator (idle/active/systemError), model badge, timestamps

### 5.2 Thread Status States
- `notLoaded` — Thread exists but not active
- `idle` — Loaded and waiting
- `active` — Turn in progress (with optional `waitingOnApproval` or `waitingOnUserInput` flags)
- `systemError` — Error state

### 5.3 App List
```json
// AppListUpdatedNotification / AppsListResponse
{
  "data": [{
    "id": "app_123",
    "name": "GitHub",
    "description": "...",
    "logoUrl": "https://...",
    "logoUrlDark": "https://...",
    "isEnabled": true,
    "isAccessible": false,
    "labels": {},
    "branding": { "category": null, "developer": "GitHub", ... }
  }]
}
```
UI: App cards with logo, name, description, enabled toggle, install button

### 5.4 Skills List
```json
// SkillsListResponse
{
  "skills": [
    {
      "name": "codebase-qa",
      "metadata": { "title": "Codebase Q&A", "description": "..." },
      "scope": "agent",
      "enabled": true
    }
  ]
}
```
UI: Skills browser with toggles, scope indicators, metadata

### 5.5 Plugin List
```json
// PluginListResponse
```
UI: Plugin cards in marketplace/gallery view with install/uninstall buttons

### 5.6 Model List
```json
// ModelListResponse
```
UI: Model selector dropdown/list showing model names, provider, capabilities

### 5.7 Thread Settings
```json
// ThreadSettings
{
  "model": "o3-mini",
  "modelProvider": "openai",
  "approvalPolicy": "untrusted" | "granular" | never,
  "approvalsReviewer": "user" | "auto_review" | "guardian_subagent",
  "sandboxPolicy": /* see SandboxPolicy */,
  "collaborationMode": { "mode": "default" | "plan", "settings": {...} },
  "cwd": "/Users/user/project",
  "effort": null | "low" | "medium" | "high",
  "personality": null | "none" | "friendly" | "pragmatic",
  "summary": null | "none" | "concise" | "detailed" | "auto",
  "serviceTier": null
}
```
UI: Settings panel with dropdowns, toggles, text fields for each setting

---

## 6. Config System (Settings Panels)

The config read response exposes the entire Codex configuration structure:

```json
// ConfigReadResponse
{
  "config": {
    "model": "o3-mini",
    "model_provider": "openai",
    "sandbox_mode": "write",
    "approval_policy": { "granular": { ... } },
    "approvals_reviewer": "user",
    "desktop": { ... },
    "tools": { ... },
    "web_search": null,
    "instructions": null,
    "developer_instructions": null,
    "analytics": { "enabled": true },
    "apps": { "_default": { "enabled": true } },
    ...
  },
  "layers": [
    { "name": { "type": "user" }, "config": {}, "version": "1" },
    { "name": { "type": "project", "path": "/project" }, "config": {}, "version": "1" }
  ]
}
```

Config layers provide hierarchical settings (user → project → system → MDM), each with their own disabled reasons.

### MDM Support (macOS-only)
```
ConfigLayerSource::name = { "type": "mdm", "domain": "com.openai.codex", "key": "managedConfig" }
```
MacOS managed preferences integration for enterprise deployment.

---

## 7. OAuth & Login Flows

### 7.1 ChatGPT OAuth Login
1. Desktop app sends `account/login` with type `"chatgpt"` or `"chatgptDeviceCode"`
2. Server responds with a device code URL or opens system browser
3. User authenticates in browser
4. Login HTML pages (`success.html`, `error.html`) provide post-auth UX:
   - **Success**: "You're signed in" + "Open Codex" button (with `codex://threads/new` deep link)
   - Shows setup prompt for API organization if `needs_setup=true`
   - Auto-redirects to Codex after 250ms
   - Dark mode aware via `prefers-color-scheme`
   - Features the Codex logo SVG (stylized C mark)
5. Server sends `account/loginCompleted` notification with success/error

### 7.2 MCP Server OAuth Login
1. Desktop app sends `mcpServer/oauthLogin` with `{ name, scopes, timeoutSecs }`
2. Server initiates OAuth flow, may open system browser
3. Server sends `mcpServer/oauthLogin/completed` notification

### 7.3 Login HTML Assets
The login pages are served by the `codex-login` crate during OAuth flows:

- **`success.html`**: "Signed in to Codex" page with ChatGPT wordmark, Codex logo SVG, "Open Codex" button, optional org setup redirect
- **`error.html`**: Error card with error title, message, code, description, help text
- **`success_legacy.html`**: Legacy version of success page

CSS tokens in login pages (actual app design tokens):
```css
--font-use: "SF Pro", ui-sans-serif, system-ui, -apple-system
--gray-0: #ffffff; --gray-50: #f9f9f9; --gray-100: #ededed;
--gray-150: #dfdfdf; --gray-300: #afafaf; --gray-500: #5d5d5d;
--gray-900: #181818; --gray-1000: #0d0d0d;
--color-background-surface: var(--gray-0);
--color-text-foreground: var(--gray-1000);
--color-border: rgb(13 13 13 / 10%);
--color-button-background: var(--gray-0);
--color-button-background-hover: var(--gray-50);
--color-button-border: var(--gray-100);
--color-button-border-hover: var(--gray-150);
--text-secondary: var(--gray-500);
```

**Dark mode** colors (triggered by `prefers-color-scheme: dark`):
```css
--color-background-surface: var(--gray-900);     /* #181818 */
--color-text-foreground: var(--gray-0);            /* #ffffff */
--color-border: rgb(255 255 255 / 8%);
--color-button-background: rgb(255 255 255 / 5%);
--text-secondary: rgb(255 255 255 / 65%);
```

This confirms the actual desktop app uses **light mode by default** with dark mode support via `prefers-color-scheme`, contrary to previous assumptions.

---

## 8. Desktop App Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                  Desktop App (macOS .app)                │
│  - Native application (not Electron, not TUI)            │
│  - Communicates via JSON-RPC WebSocket to daemon         │
│  - Deep link handler: codex://threads/new                │
│  - Signed with Apple Developer ID cert                   │
│  - Entitlement: com.apple.security.cs.allow-jit          │
├─────────────────────────────────────────────────────────┤
│           codex-cli (CLI orchestrator)                   │
│  - `codex desktop` launches the app                       │
│  - Downloads DMG from persistent.oaistatic.com           │
│  - Installs to /Applications/Codex.app                   │
│  - Opens workspace via `open -a Codex.app <workspace>`   │
├─────────────────────────────────────────────────────────┤
│       codex-app-server-daemon (background process)       │
│  - PID file managed, auto-updating                       │
│  - Unix socket at $CODEX_HOME/app-server.sock            │
│  - WebSocket JSON-RPC transport                          │
│  - Start/stop/restart lifecycle                          │
│  - Remote control endpoint for headless operation        │
├─────────────────────────────────────────────────────────┤
│            app-server (core runtime)                     │
│  - In-process or separate process                        │
│  - Thread/turn management                                │
│  - Agent execution                                       │
│  - Tool execution (filesystem, terminal, MCP, etc.)       │
│  - Approval routing                                      │
│  - Config management                                     │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Facts
- The macOS app is a **native .app bundle** (not Electron, not web-based)
- Uses `com.apple.security.cs.allow-jit` entitlement (JIT compilation — suggests a JIT-compiled GUI framework like SwiftUI or native rendering)
- Signed and notarized with Apple Developer ID
- Distributed via `.dmg` from `https://persistent.oaistatic.com/codex-app-prod/`
- DMG URLs: `Codex.dmg` (ARM64) and `Codex-latest-x64.dmg` (Intel)
- The app receives a workspace path as CLI argument when launched
- Deep link protocol: `codex://threads/new`
- The app-server protocol is transport-agnostic (same protocol used by TUI via in-process channels)

---

## 9. Complete Protocol Schema Index

All schema files at `/root/Dev/codex/codex-rs/app-server-protocol/schema/json/`:

### Base (root)
- `ClientRequest.json` — All request types with full parameter schemas
- `ClientNotification.json` — Client-side notification types
- `ServerNotification.json` — All server notification types
- `ServerRequest.json` — Server request types (approvals, input requests)
- `JSONRPCMessage.json` — JSON-RPC envelope
- `ApplyPatchApprovalParams/Response.json` — Patch approval request/response
- `AttestationGenerateParams/Response.json` — Attestation generation
- `ChatgptAuthTokensRefreshParams/Response.json` — Token refresh
- `CommandExecutionRequestApprovalParams/Response.json` — Command approval
- `DynamicToolCallParams/Response.json` — Dynamic tool calls
- `ExecCommandApprovalParams/Response.json` — Exec command approval
- `FileChangeRequestApprovalParams/Response.json` — File change approval
- `FuzzyFileSearchParams/Response.json` — Fuzzy file search
- `FuzzyFileSearchSession*Notification.json` — Search session streaming
- `McpServerElicitationRequestParams/Response.json` — MCP elicitation
- `PermissionsRequestApprovalParams/Response.json` — Permissions approval
- `ToolRequestUserInputParams/Response.json` — User input requests

### v2 Protocol
Full v2 protocol schemas at `schema/json/v2/`:

**Account**: `AccountLoginCompletedNotification`, `AccountUpdatedNotification`, `AccountRateLimitsUpdatedNotification`, `LoginAccountParams/Response`, `LogoutAccountResponse`, `CancelLoginAccountParams/Response`, `GetAccountParams/Response`

**Agent**: `AgentMessageDeltaNotification`

**Apps**: `AppListUpdatedNotification`, `AppsListParams/Response`

**Config**: `ConfigReadParams/Response`, `ConfigWriteResponse`, `ConfigBatchWriteParams`, `ConfigValueWriteParams`, `ConfigRequirementsReadResponse`, `ConfigWarningNotification`

**Command Exec**: `CommandExecParams/Response`, `CommandExecOutputDeltaNotification`, `CommandExecWriteParams/Response`, `CommandExecResizeParams/Response`, `CommandExecTerminateParams/Response`

**File System**: `FsReadFileParams/Response`, `FsWriteFileParams/Response`, `FsReadDirectoryParams/Response`, `FsGetMetadataParams/Response`, `FsCreateDirectoryParams/Response`, `FsCopyParams/Response`, `FsRemoveParams/Response`, `FsWatchParams/Response`, `FsUnwatchParams/Response`, `FsChangedNotification`, `FileChangePatchUpdatedNotification`, `FileChangeOutputDeltaNotification`

**Marketplace**: `MarketplaceAddParams/Response`, `MarketplaceRemoveParams/Response`, `MarketplaceUpgradeParams/Response`

**MCP**: `McpServerOauthLoginParams/Response`, `McpServerOauthLoginCompletedNotification`, `McpServerToolCallParams/Response`, `McpServerRefreshResponse`, `McpServerStatusUpdatedNotification`, `McpResourceReadParams/Response`, `McpToolCallProgressNotification`, `ListMcpServerStatusParams/Response`

**Model**: `ModelListParams/Response`, `ModelProviderCapabilitiesReadParams/Response`, `ModelReroutedNotification`, `ModelVerificationNotification`

**Threads**: `ThreadStartParams/Response`, `ThreadResumeParams/Response`, `ThreadReadParams/Response`, `ThreadListParams/Response`, `ThreadLoadedListParams/Response`, `ThreadArchiveParams/Response`, `ThreadForkParams/Response`, `ThreadSetNameParams/Response`, `ThreadMetadataUpdateParams/Response`, `ThreadRollbackParams/Response`, `ThreadGoalSetParams/Response`, `ThreadGoalGetParams/Response`, `ThreadGoalClearParams/Response`, `ThreadInjectItemsParams/Response`, `ThreadCompactStartParams/Response`, `ThreadSubscribeParams/Response`, `ThreadUnsubscribeParams/Response`, `ThreadApproveGuardianDeniedActionParams/Response`, `ThreadStartedNotification`, `ThreadStatusChangedNotification`, `ThreadClosedNotification`, `ThreadArchivedNotification`, `ThreadNameUpdatedNotification`, `ThreadGoalUpdatedNotification`, `ThreadGoalClearedNotification`, `ThreadSettingsUpdatedNotification`

**Turns**: `TurnStartParams/Response`, `TurnSteerParams/Response`, `TurnInterruptParams/Response`, `TurnEnvironmentParams`, `TurnStartedNotification`, `TurnCompletedNotification`, `TurnDiffUpdatedNotification`, `TurnPlanUpdatedNotification`

**Realtime Audio**: `ThreadRealtimeStartedNotification`, `ThreadRealtimeClosedNotification`, `ThreadRealtimeErrorNotification`, `ThreadRealtimeItemAddedNotification`, `ThreadRealtimeTranscriptDeltaNotification`, `ThreadRealtimeTranscriptDoneNotification`, `ThreadRealtimeOutputAudioDeltaNotification`, `ThreadRealtimeSdpNotification`

**Plugins**: `PluginInstallParams/Response`, `PluginUninstallParams/Response`, `PluginListParams/Response`, `PluginReadParams/Response`, `PluginSkillReadParams/Response`, `PluginInstalledParams/Response`, `PluginShare*Params/Response`

**Skills**: `SkillsListParams/Response`, `SkillsConfigWriteParams/Response`, `SkillsChangedNotification`

**Review**: `ReviewStartParams/Response`

**Process**: `ProcessExitedNotification`, `ProcessOutputDeltaNotification`

**Notifications**: `ContextCompactedNotification`, `DeprecationNoticeNotification`, `ErrorNotification`, `GuardianWarningNotification`, `HookStartedNotification`, `HookCompletedNotification`, `HooksListParams/Response`, `ItemStartedNotification`, `ItemCompletedNotification`, `ItemGuardianApprovalReview*Notification`, `PlanDeltaNotification`, `ReasoningTextDeltaNotification`, `ReasoningSummaryTextDeltaNotification`, `ReasoningSummaryPartAddedNotification`, `RemoteControlStatusChangedNotification`, `ServerRequestResolvedNotification`, `TerminalInteractionNotification`, `ThreadRealtime*Notification`, `WindowsSandbox*Notification`

**Experimental Features**: `ExperimentalFeatureListParams/Response`, `ExperimentalFeatureEnablementSetParams/Response`

**External Agent Config**: `ExternalAgentConfigDetectParams/Response`, `ExternalAgentConfigImportParams/Response`, `ExternalAgentConfigImportCompletedNotification`

**Other**: `SendAddCreditsNudgeEmailParams/Response`, `FeedbackUploadParams/Response`, `ConfigRequirementsReadResponse`
