# bapX — Codex Build Spec
## CTO: Codex CLI | Product: bapX (browser AI agent platform)

## PROJECT LOCATION
/root/Dev/bapx/
- Backend: /root/Dev/bapx/backend.py (Python FastAPI, port 7654, already running)
- Frontend: /root/Dev/bapx/static/dashboard.html (pure HTML/CSS/JS, being built now)
- Reference docs: /root/Dev/bapx/reference/ (hermes-docs, manus-docs, openai-agents-docs, opensandbox-docs)

## STACK (NO EXCEPTIONS)
- Python (FastAPI) — backend only
- HTML + CSS + vanilla JS — frontend only
- NO React, NO Node.js backend, NO TypeScript, NO frameworks

## WHAT EXISTS (backend.py)
- User auth: signup/login with JWT
- ALL model providers: 18 API key + 4 OAuth (ChatGPT/Claude/Grok/Gemini/Nous/Qwen/Copilot)
- OAuth device flow endpoints (start, poll, status)
- 101 default skills loaded from Hermes skill dirs
- Chat streaming via SSE + OpenAI-compatible API calls
- Session management (list, get, delete)

## WHAT NEEDS TO BE BUILT

### 1. DASHBOARD (static/dashboard.html)
A single self-contained HTML file. Replace the current one.

**Pages (hash-based routing):**
- #login — Email + password form → POST /api/login → store token → #dashboard
- #signup — All fields form → POST /api/signup → store token → #dashboard
- #dashboard — 3-column layout (sidebar | chat | right panel)

**3-Column Layout:**
- LEFT SIDEBAR (desktop: w-64, mobile: w-12 icon rail):
  * Logo "bapX" with purple gradient (#9651b8)
  * Nav items with SVG icons: Chat, Settings (gear), Skills (book)
  * Bottom: user avatar circle (initials) + username
  * MOBILE: icons only (w-12), tap expands to w-64 with backdrop overlay. State in localStorage.

- CENTER CHAT:
  * Messages area — scrollable, user msg right-aligned purple, assistant left-aligned dark card
  * SSE streaming — append content as chunks arrive, show spinner while waiting
  * Input bar — textarea + send button
  * Session selector dropdown in header
  * New session button

- RIGHT PANEL (w-320):
  * Tabs: Canvas | Browser | Terminal
  * Placeholder content per tab (just icons + "Canvas" / "Browser" / "Terminal" text)
  * Resizable divider between center and right panels (drag to resize)
  * Mobile: hidden by default, can slide open

**Settings View (replaces chat area when gear clicked):**
A) Model Connection section:
   - Current connection status display (shows provider name + connected/disconnected badge)
   - API Key provider dropdown (loaded from GET /api/providers)
   - Model dropdown (changes based on selected provider)
   - API key input (password field) + Save button
   - OAuth provider cards for: ChatGPT, Nous, Qwen, Copilot
   - Clicking OAuth card → POST /api/auth/oauth/start → shows modal with user_code + verification_uri + polling spinner
   - Polls POST /api/auth/oauth/poll every 3s → shows "Connected ✓" when done

B) Skills Browser section:
   - Search bar to filter skills
   - Grid of skill cards (name, description, category badge, toggle switch)
   - "Save Skills" button → POST /api/user/skills
   - Shows "X of Y skills enabled" count

**API calls:** All use fetch() with Bearer token from localStorage('bapx_token'). Token checked on load. Auth errors → #login.

**Styling:**
- Dark theme: #0f0f13 bg, #e8e8f0 text, #9651b8 accent
- Inter font from Google Fonts
- Glass-morphism cards (rgba background, subtle borders)
- Smooth transitions on sidebar expand/collapse
- Scrollbar styling
- All CSS inline in <style> tag
- All JS inline in <script> tag
- NO external CSS/JS files except Inter font

### 2. AGENT RUNTIME INTEGRATION (new files in /root/Dev/bapx/)

Create /root/Dev/bapx/agent_runtime.py:
A Python module that:
- Uses OpenAI Agents SDK (pip installed: openai-agents==0.17.3) to create agents
- Each user gets an Agent with their configured provider/model
- Agent has tools: execute_code (run Python), web_search (via requests), file_operations
- Agent instructions come from user's SOUL.md (stored in DB as soul_md field)
- Implements a /api/agent/run endpoint in backend.py that:
  * Takes user message, session_id
  * Creates Agent with user's model config (API key or OAuth token)
  * Runs the agent with the conversation history
  * Streams responses back via SSE
  * Saves conversation to session

Create /root/Dev/bapx/sandbox_manager.py:
A module that manages per-user sandboxes via OpenSandbox:
- Uses opensandbox==0.1.9 SDK (pip installed)
- start_sandbox(user_id): creates sandbox via OpenSandbox API
- stop_sandbox(user_id): stops sandbox
- exec_in_sandbox(user_id, command): runs command in user's sandbox
- Sandbox contains Codex CLI for autonomous coding tasks
- Sandbox contains basic dev tools (python3, pip, git, curl)

### 3. BACKEND UPGRADE (modify backend.py)

Add to backend.py:
- Import and register agent_runtime routes
- Import and register sandbox_manager routes
- Add /api/agent/run endpoint (delegates to agent_runtime)
- Add /api/sandbox/* endpoints (start, stop, status, exec)
- Update GET /api/user/profile to include sandbox status

### 4. COMPETITOR ANALYSIS REFERENCE
Competitors documented in /root/Dev/bapx/reference/:
- Manus.im: browser operator, cloud browser, collab, design view, mail, meeting minutes, multi-modal, projects, skills, slides, wide research, MCP connectors, website builder, access control, payments, analytics, SEO, GitHub integration, Figma import
- Hermes Agent: 20+ LLM providers, OAuth, gateway (Telegram/Discord/Slack/etc), skills, cron, delegation, memory, MCP, kanban, ACP

### 5. GIT WORKFLOW
- After building, commit all changes
- Use git push with OAuth token: git push https://getwinharris:***@github.com/getwinharris/bapX-agent.git main

## BUILD ORDER
1. First: Upgrade dashboard.html (the user-facing UI)
2. Second: Create agent_runtime.py (the core agent execution)
3. Third: Create sandbox_manager.py (sandbox management)
4. Fourth: Modify backend.py to wire everything together
5. Fifth: Git commit + push

## VERIFICATION
- After each file: check syntax (python3 -c "compile('file.py', 'file', 'exec')")
- After dashboard: open in browser and verify login/signup/dashboard render
- After backend upgrade: curl -s http://localhost:7654/health
- After push: verify on github.com/getwinharris/bapX-agent
