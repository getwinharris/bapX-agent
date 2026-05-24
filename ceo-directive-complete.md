# bapX — Complete Blueprint (Compiled from CEO directives)

> **Source:** All directives from Harris (CEO) across full conversation session
> **Date:** May 24, 2026
> **Rule:** This is THE source of truth. Everything below must be implemented exactly as stated.

---

## 1. LAYOUT — Exact Manus.im 3-Column Layout

### Left Sidebar (48px icon rail ALWAYS)
- **Always minimized** — 48px icon-only rail by default on ALL screen sizes
- **Expand on click** — clicking hamburger/expand button slides to full 256px
- **Sections needed:**
  - 🗂 Projects (top section)
  - 📚 Library (Skills, MCPs, saved resources)
  - 🕐 History (chat sessions)
  - ⚙️ Settings (bottom, near user avatar)
- No auto-expand. No hover-expand. Only click-to-expand.
- Mobile: same 48px rail, overlay when expanded with backdrop

### Center Chat Area
- Chat messages with proper styling
- **Activity/Diff/Changelog stream** — real-time display of what agent is doing:
  - Tool calls being executed
  - Files being created/modified
  - Code diffs showing exactly what changed
  - Status updates (sandbox spinning up, model loading, etc.)
- Chat input at bottom
- Model selector in header

### Right Panel (Canvas | Browser | Terminal) — ALWAYS COLLAPSED
- **Always minimized by default** — 0 width, no border
- **Expand on click** — clicking Canvas/Browser/Terminal buttons opens it
- **Tabs:**
  - **Canvas** — visual workspace for diagrams, designs, websites
  - **Browser** — live browser preview inside sandbox (iframe to sandbox's web server)
  - **Terminal** — live terminal session inside user's sandbox
- **No sandbox toggle** — remove the Start/Stop sandbox button entirely
  - Sandbox auto-starts on first message
  - Sandbox auto-stops after inactivity
  - Status indicator only (green dot = running, gray = stopped)

---

## 2. AUTH — OAuth & Model Connections

### OAuth Flow (must work like Hermes)
- Device code flow for: ChatGPT (OpenAI), Claude (Anthropic), Google, Nous Portal, Qwen Portal
- Copilot device code flow for GitHub Copilot
- **Must use REAL client IDs** — not fake "bapx-device-flow"
- Polling with proper intervals + error handling
- Verification URL must include the user_code (verification_uri_complete)
- Token refresh handling

### API Key Providers
- 18 API key providers (OpenAI, Anthropic, Google, DeepSeek, OpenRouter, xAI, Groq, Mistral, Together, Cohere, Perplexity, HuggingFace, MiniMax, Kimi, Xiaomi, Z.AI GLM, DashScope, StepFun)
- **OpenRouter** — must add HTTP-Referer + X-Title headers ✓ (done)
- **Anthropic** — must use x-api-key header, not Bearer ✓ (done)
- **Perplexity** — base URL doesn't end in /v1, handle in proxy ✓ (done)

### Model Selection — DYNAMIC from provider API
- **NOT pre-built/hardcoded lists**
- After user authenticates with API key:
  1. Save the key
  2. Call `GET {provider_base_url}/v1/models` (or equivalent)
  3. Parse `data[].id` from response
  4. Populate model dropdown from live API response
  5. Cache fetched models in user profile (`cached_models` column)
- ✓ Endpoint added: `POST /api/providers/fetch-models`
- ✓ Column added: `cached_models TEXT DEFAULT '[]'`

---

## 3. SKILLS — bapX-Specific Only

- **NEVER load Hermes global skills** from `/usr/local/lib/hermes-agent/skills/`
- Only load skills from `data/skills/` directory
- No pre-loaded skills unless I explicitly tell you
- Skills are user-created in their sandbox
- ✓ Done: Removed Hermes skills directory reference from backend.py

---

## 4. NO HERMES IN bapX CODEBASE

- Zero references to "hermes", "Hermes", "Hermes Agent", "powered by Hermes"
- No Hermes branding anywhere in code, comments, README, AGENTS.md, landing page
- ✓ Done: Cleaned from backend.py, README.md, AGENTS.md

---

## 5. MISSING FEATURES — Must Build

### Custom Subdomain for Published Websites
- Like Manus.im — users can publish websites they build and assign a custom domain
- bapX subdomain: `{username}.bapx.in`
- Custom domain: user's own domain pointed via CNAME
- Caddy handles virtual hosting
- Sandbox serves built site, Caddy proxies to it

### Projects Section (Left Sidebar)
- CRUD for user projects
- Each project = isolated workspace with its own sandbox, files, sessions
- Project list in sidebar
- Click to switch between projects

### Library Section (Left Sidebar)
- Saved skills
- MCP server connections
- Templates
- Saved prompts

### Diff / Changelog / Activity Stream
- Real-time display of agent actions in chat area
- File diffs (what changed, added, removed)
- Tool calls being executed
- Status updates
- Like Claude Code's activity stream or Codex's plan view

### Browser Preview (Right Panel)
- Iframe that connects to sandbox's web server
- When user builds a website, preview it live
- URL navigation bar at top

### Terminal (Right Panel)
- Live terminal connected to user's sandbox
- xterm.js or similar
- User can run commands directly

---

## 6. UI POLISH — Manus.im Quality

- Clean, minimal design
- Proper spacing (2rem/2.5rem padding)
- Smooth cubic-bezier transitions
- Hover effects on cards (lift + shadow)
- Proper typography with letter-spacing
- SVG icons everywhere (no emoji)
- Dark theme consistent throughout
- Connection status cards with avatar + status badge
- Provider/OAuth cards with color-coded accents

---

## 7. CURRENT STATE (What's Already Built)

### ✓ Done & Pushed
| Feature | Commit | Status |
|---------|--------|--------|
| Agent Name removed from signup | a48b250 | ✅ |
| Separate pricing/about/docs pages | a48b250 | ✅ |
| Mobile form keyboard fix (100dvh) | a48b250 | ✅ |
| Elegant SVG icons (no emoji) | multiple | ✅ |
| Landing page screenshot carousel | a48b250 | ✅ |
| OpenRouter headers fix | 990ba5a | ✅ |
| Anthropic x-api-key header | 990ba5a | ✅ |
| Base URL routing fix | 990ba5a | ✅ |
| Manus-style settings UI | 990ba5a | ✅ |
| Dynamic model fetching endpoint | 603e30f | ✅ |
| cached_models column | 603e30f | ✅ |
| Remove Hermes global skills | 3c1d0df | ✅ |
| Clean Hermes references | 05c6743 | ✅ |

### ❌ Still Missing (Needs Build)
| Feature | Priority |
|---------|----------|
| Left sidebar → 48px icon rail always | HIGH |
| Projects section | HIGH |
| Library section | HIGH |
| History/activity stream | HIGH |
| Right panel → always collapsed | HIGH |
| Working browser preview in sandbox | HIGH |
| Working terminal in sandbox | HIGH |
| Auto sandbox (no toggle button) | MEDIUM |
| Custom subdomain for published sites | MEDIUM |
| Diff/changelog display of agent actions | MEDIUM |
| Real OAuth with proper client IDs | HIGH |
