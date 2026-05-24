# bapX Platform — Knowledge Graph

> Synthesized from 44 Manus.im documentation pages + OpenAI Agents SDK + OpenSandbox research
> This is the blueprint. Build everything from this document.

---

## 1. CORE ARCHITECTURE

### 1.1 Three-Column Layout

```
┌────────────────────────┬──────────────────────────────┬──────────────────────┐
│ LEFT SIDEBAR           │ CENTER PANEL                │ RIGHT PANEL          │
│ (collapsible)          │                              │ (context-dependent)   │
│                        │                              │                      │
│ ➕ New Chat            │  Chat with AI agent          │ [Tabs change based   │
│ 📁 Projects            │  - Streaming messages        │  on what's being     │
│ 🔌 MCPs                │  - Code blocks               │  built]              │
│ ⚡ Automation          │  - File attachments           │                      │
│ 🧠 Skills              │  - Inline results            │  Website mode:       │
│ 📚 Library             │  - Agent actions             │    Files | Canvas    │
│   🖼️ Images            │                              │    Browser|Terminal  │
│   🌐 Websites          │  Input bar:                  │    Commit|DB|Monitor │
│   🎬 Videos            │  - Text input                │    | Domain          │
│   📊 Presentations     │  - / slash commands (skills) │                      │
│   📄 Other             │  - @ mentions (tools/MCPs)   │  Slide mode:         │
│ 👤 Settings (bottom)   │  - File upload               │    Preview|Editor    │
│                        │                              │    Themes|Notes      │
│                        │                              │                      │
│                        │                              │  Image mode:         │
│                        │                              │    Preview|Design    │
│                        │                              │    Tools|Gallery     │
│                        │                              │                      │
│                        │                              │  Doc mode:           │
│                        │                              │    Preview|Editor    │
│                        │                              │    File tree         │
│                        │                              │                      │
│                        │                              │  Code mode:          │
│                        │                              │    Files|Review      │
│                        │                              │    Lint|Test         │
└────────────────────────┴──────────────────────────────┴──────────────────────┘
```

### 1.2 Tech Stack

```
Frontend (React + Vite + Tailwind)
    │
    ▼ SSE / WebSocket
Backend (Fastify :3001)
    │
    ├── Auth Service (JWT + password hash)
    ├── User Service (CRUD, profile, settings)
    ├── Sandbox Orchestrator (OpenSandbox API)
    ├── Agent Bridge (SSE to sandbox agent)
    ├── Library Service (sandbox filesystem proxy)
    ├── Automation Service (cron scheduler)
    ├── MCP Service (MCP server registry + toggles)
    └── Skills Service (skill loader + registry)
    │
    ▼
OpenSandbox REST API (Docker orchestration)
    │
    ▼
┌──────────────────────────────────────────────┐
│ DOCKER SANDBOX (per user, named by username) │
│                                               │
│  Python 3.12 + OpenAI Agents SDK             │
│  Node.js                                      │
│  Playwright (browser automation)             │
│  File system:                                 │
│    /home/user/                                │
│      ├── projects/                            │
│      ├── images/                              │
│      ├── websites/                            │
│      ├── presentations/                       │
│      ├── documents/                           │
│      └── downloads/                           │
│                                               │
│  Agent runs inside sandbox:                   │
│    Agent(name, instructions=SOUL.md,          │
│           tools=[WebSearch, Computer,         │
│                  CodeInterpreter, ...])        │
└──────────────────────────────────────────────┘
```

### 1.3 Data Flow

```
User types message
  → Frontend sends to Backend via SSE
  → Backend looks up user's sandbox (or creates new session)
  → Backend sends message to sandbox via OpenSandbox execd API
  → OpenAI Agents SDK processes in sandbox
  → Agent uses tools (web search, browser, code, files)
  → Agent generates response + files
  → Results streamed back through Backend to Frontend
  → Files saved to sandbox filesystem
  → Library panel refreshes showing new files
  → Right panel updates based on context
```

---

## 2. SIGNUP & ONBOARDING FLOW

### 2.1 Signup Form (Two-Step)

**Step 1 — Account Info:**
- Username (unique check in real-time)
- Full Name
- Email
- Age (date picker)
- Nature of work/study (text)
- Bio / self-description (tells agent who you are)

**Step 2 — Agent & Auth:**
- Agent Name (e.g. "Aria")
- Password
- Confirm Password

### 2.2 Post-Signup Actions

1. Validate all fields
2. Create user in database (password hashed)
3. Create SOUL.md:
```markdown
# SOUL.md — [Agent Name]

You are [Agent Name], [User Name]'s personal autonomous AI agent.

## About [User Name]
- Role/Study: [nature of work/study]
- Self-description: [bio]

## Operating Context
- Platform: bapX
- Tools available: Web Search, Browser, Code Execution, File System, MCP Servers, Skills
- User's sandbox at /home/[username]/
```
4. Create Docker sandbox via OpenSandbox:
```python
sandbox = await Sandbox.create(
    "bapx-agent:latest",
    metadata={"name": username},
    env={
        "OPENAI_API_KEY": "...",  # User's key
        "AGENT_NAME": agent_name,
        "USER_NAME": username,
        "SOUL_MD": soul_md_content
    },
    resource_limits={"cpu": "1", "memory": "2Gi"},
    timeout=86400  # 24h default
)
```
5. Create default project "Getting Started"
6. Install default MCP servers (Filesystem)
7. Create welcome chat session
8. Return JWT token + redirect to dashboard

---

## 3. LEFT SIDEBAR — DETAILED

### 3.1 New Chat Button (top)

```
➕ New Chat
```
- Click → creates new chat session in current project (or standalone)
- Shows empty chat with suggested prompts

### 3.2 Projects Section

```
📁 PROJECTS
├── Project Name 1
│   ├── 📄 Chat session 1
│   ├── 📄 Chat session 2
│   └── + New Chat
├── Project Name 2
│   └── ...
└── + New Project
```

**Project = persistent workspace with:**
- Master instruction (system prompt for agent)
- Knowledge base (uploaded files)
- Shared across all chats in project
- Pinnable, draggable, filterable

**Chat sessions = individual conversations inside a project.**
- Each has its own history
- Inherits project's master instruction + knowledge base
- Can be moved between projects (like folders)

### 3.3 MCPs Section

```
🔌 MCPs
├── Filesystem      [● ON]
├── GitHub          [○ OFF]
├── Notion          [○ OFF]
├── Gmail           [○ OFF]
├── ...             [  ]
│
├── 🔗 Browse GitHub MCP Marketplace →
│
├── Install new MCP:
│   [npm|npx|pip|uri] [_______________]
│   [Install]
```

**MCP = Model Context Protocol servers**
- Toggle ON/OFF per installed MCP
- Clicking "Browse GitHub MCP Marketplace" → opens external GitHub search
- Install via: `npx @modelcontextprotocol/server-filesystem`, MCP URI, or pip install
- Prebuilt connectors available: Gmail, Notion, GitHub, Stripe, Slack, Google Calendar, HubSpot, etc.

### 3.4 Automation Section

```
⚡ AUTOMATION
├── 📋 Scheduled Tasks
│   ├── Daily news digest      [●]
│   ├── Weekly competitor rpt  [●]
│   ├── Health check           [○]
│   └── + New Task
│
├── 📊 Execution History
│   ├── Today at 9AM ✓
│   ├── Yesterday at 9AM ✓
│   └── ...
└── ⚙️ Settings
```

**Scheduled task flow (from Manus docs):**
1. User says: "Every day at 9AM, research AI news and email me a summary"
2. System creates cron job
3. At scheduled time, agent runs the task autonomously
4. Results delivered to user (email, Slack, saved file)

**Schedule types:** Daily, Weekdays, Weekly (day), Monthly (date), Custom, One-time
**Output methods:** Email, Slack, Google Drive, Saved to Library, File download

### 3.5 Skills Section

```
🧠 SKILLS
├── Web Research        [loaded]
├── Code Review         [not loaded]
├── Data Analysis       [not loaded]
├── ...
│
├── + Add Skill
│   ├── 🛠 Build with Agent (save from chat)
│   ├── 📁 Upload (.zip/.skill)
│   ├── 📦 Official Library
│   └── 🐙 Import from GitHub
```

**Skills = reusable workflows/instructions for the agent**
- File-based (SKILL.md + scripts + references)
- Activated via `/` slash command in chat
- Progressive disclosure: metadata → instructions → resources
- Skills ≠ MCPs. Skills = operating manuals. MCPs = data pipelines.

### 3.6 Library Section

```
📚 LIBRARY
├── 🖼️ Images (24)
│   ├── project-name/
│   │   ├── hero-banner.png
│   │   ├── logo-v2.png
│   │   └── screenshot-1.jpg
│   └── ...
├── 🌐 Websites (3)
│   ├── saas-landing/
│   │   ├── [🔗 Open in Canvas]  ← running site
│   │   ├── index.html
│   │   ├── style.css
│   │   └── ...
│   └── blog-site/
│       └── ...
├── 🎬 Videos (5)
│   ├── product-demo.mp4
│   └── ...
├── 📊 Presentations (8)
│   ├── Q4-review.pptx
│   └── ...
└── 📄 Other (12)
    ├── report.md
    ├── data.csv
    └── ...
```

**Library = Sandbox filesystem explorer**
- Maps directly to `/home/[username]/` directories
- Agent creates files → they appear in Library
- **No auto-save.** Library IS the filesystem.
- Clicking a running website → opens in Canvas tab
- Clicking an image → opens preview (with Design Tools in slide mode)
- Clicking a file → shows content/code
- Organized by file type sub-sections
- Files are under their project subdirectory

### 3.7 Settings (bottom avatar)

```
👤 Avatar
└── Settings
    ├── 👤 Profile
    │   ├── Username, Name, Email, Age
    │   ├── Agent Name
    │   ├── Bio / Self-description
    │   └── Nature of work/study
    │
    ├── 🔑 API & Keys
    │   ├── API Endpoint (our URL)
    │   ├── API Key (generate/revoke)
    │   ├── OpenAI API Key (for agent)
    │   └── Other provider keys
    │
    ├── 🔌 Our MCP
    │   ├── MCP server details we expose
    │   └── Connection instructions
    │
    ├── 📖 Our Documentation
    │   └── (only bapX docs, no external)
    │
    ├── 🧠 Memory
    │   ├── View agent's memory entries
    │   └── Delete specific memories
    │
    ├── 📋 Session Logs
    │   ├── View chat history
    │   ├── Search sessions
    │   └── Delete sessions
    │
    ├── 🛠 Skills
    │   ├── View installed skills
    │   ├── Edit skill files
    │   └── Delete skills
    │
    └── 📚 Library
        ├── Browse all generated files
        ├── View by type or project
        └── Delete files
```

---

## 4. CENTER PANEL — CHAT INTERFACE

### 4.1 Layout

```
┌──────────────────────────────────────┐
│ Project: SaaS App                    │
│ Chat: Building landing page          │
├──────────────────────────────────────┤
│                                      │
│  User: Build me a landing page       │
│  ─────────────────────────────       │
│  Agent: I'll build a landing page    │
│  with hero, features, pricing...     │
│                                      │
│  [Code block: index.html]            │
│  [Code block: style.css]             │
│                                      │
│  [Image: hero-preview.png]           │
│  [Link to live preview]              │
│                                      │
│  User: Make the button blue          │
│  ─────────────────────────────       │
│  Agent: Done! Button is now #9651b8  │
│                                      │
│  [File attached: landing-page.zip]   │
│                                      │
├──────────────────────────────────────┤
│ [Type a message...]       [/] [@] [+]│
└──────────────────────────────────────┘
```

### 4.2 Input Bar Features

- **Text input** — main input
- **/** — slash commands (trigger skills)
- **@** — mention MCPs, tools, agents
- **+** — attach files (images, documents, code)
- **Send** button
- **Streaming** — messages appear token-by-token

### 4.3 Agent Message Types

| Type | Display |
|------|---------|
| Text response | Streaming markdown |
| Code block | Syntax highlighted, copy button, "Ask bapX" button |
| Image | Inline preview |
| File | Download link with icon |
| Tool call | Collapsible: "🔍 Searching the web..." |
| Error | Red highlight with retry button |
| Plan | Expandable: "📋 Development Plan" (before building) |
| Approval request | "🔐 Approve running this command?" with Allow/Deny |

---

## 5. RIGHT PANEL — CONTEXT-DEPENDENT

### 5.1 Website Mode (user building a website)

```
┌──────────────────────────────────────┐
│ [Files] [Canvas] [Browser] [Terminal]│
│ [Commit] [DB] [Monitor] [Domain]    │
├──────────────────────────────────────┤
│                                      │
│ (Active tab content)                 │
│                                      │
│ Files:                               │
│ ├── index.html                       │
│ ├── style.css                        │
│ ├── script.js                        │
│ └── assets/                          │
│                                      │
│ or                                   │
│                                      │
│ Canvas: Live preview of site         │
│ [Desktop/Mobile toggle] [URL bar]    │
│ [Fullscreen]                         │
│ ← Click element → Quick Style Panel  │
│   Colors | Typography | Spacing      │
│   Or "AI Edit: [prompt]"             │
│                                      │
│ or                                   │
│                                      │
│ Browser: Agent-controlled browser    │
│ [URL bar] [← →] [Take Over]         │
│ (Full browser viewport)              │
│                                      │
│ or                                   │
│                                      │
│ Terminal: Code execution             │
│ $ npm run build                      │
│ ✓ Built in 2.3s                      │
│                                      │
│ or                                   │
│                                      │
│ Commit: git history                  │
│ [Commit message] [Author] [Date]     │
│ ● Added navbar component             │
│ ● Fixed mobile responsiveness        │
│                                      │
│ or                                   │
│                                      │
│ DB: Database explorer                │
│ Tables: users, products, orders      │
│ [Query] [________] [Run]             │
│                                      │
│ or                                   │
│                                      │
│ Monitor: Logs & metrics              │
│ [Logs] [Metrics] [Errors]           │
│ 200 GET /api/users 12ms              │
│                                      │
│ or                                   │
│                                      │
│ Domain: Connect custom domain        │
│ [yourdomain.com] [Connect]           │
│ Status: Not connected                │
│ DNS records to configure:            │
│ A → 123.456.789.0                    │
└──────────────────────────────────────┘
```

### 5.2 Slide Mode (user creating presentation)

```
┌──────────────────────────────────────┐
│ [Slides Preview] [Editor] [Themes]   │
│ [Speaker Notes]                      │
├──────────────────────────────────────┤
│                                      │
│ Slides Preview:                      │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐           │
│ │ 1 │ │ 2 │ │ 3 │ │ 4 │  ← thumbnails
│ └───┘ └───┘ └───┘ └───┘           │
│                                      │
│ [Active slide full preview]          │
│                                      │
│ Editor:                              │
│ Edit text, images, layout directly   │
│                                      │
│ Themes: Apply/upload template .pptx  │
│                                      │
│ Speaker Notes: Edit talking points   │
└──────────────────────────────────────┘
```

### 5.3 Image Mode (user generating/editing images)

```
┌──────────────────────────────────────┐
│ [Preview] [Design Tools] [Gallery]   │
├──────────────────────────────────────┤
│                                      │
│ Preview: Full-size image display     │
│                                      │
│ Design Tools:                        │
│ 🎯 Mark Tool — select element       │
│ 🖌️ Quick Style — colors, fonts      │
│ ✏️ Edit Text — extract & edit text  │
│ 🎨 Style — change style completely  │
│                                      │
│ Gallery: All generated images        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐               │
│ │  │ │  │ │  │ │  │                 │
│ └──┘ └──┘ └──┘ └──┘               │
└──────────────────────────────────────┘
```

### 5.4 Document Mode (user writing docs/reports)

```
┌──────────────────────────────────────┐
│ [Preview] [Editor] [File Tree]       │
├──────────────────────────────────────┤
│                                      │
│ Preview: Rendered markdown/doc       │
│                                      │
│ Editor: Rich text editor             │
│                                      │
│ File Tree:                           │
│ ├── report.md                        │
│ ├── images/                          │
│ └── references/                      │
└──────────────────────────────────────┘
```

### 5.5 Code Mode (user writing code)

```
┌──────────────────────────────────────┐
│ [Files] [Review] [Lint] [Test]       │
├──────────────────────────────────────┤
│                                      │
│ Files: File tree + code viewer       │
│                                      │
│ Review: Diff view of changes         │
│                                      │
│ Lint: ESLint/prettier output         │
│                                      │
│ Test: Test runner output             │
└──────────────────────────────────────┘
```

---

## 6. WORKFLOWS

### 6.1 Full App-Building Workflow (from Manus "Getting Started")

```
User: "Build me a modern landing page for a SaaS product"
  │
  ▼
Agent analyzes request → presents development plan
  │
  ▼
User approves plan → Agent starts building
  │
  ├── Scaffolds project structure
  ├── Writes frontend (HTML/CSS/JS or React)
  ├── Sets up backend (if needed)
  ├── Configures database (if needed)
  ├── Deploys live preview to Canvas
  └── Continues iterating
  │
  ▼
Right panel: Files tab shows all source code
             Canvas tab shows live preview
             Terminal shows build output
  │
  ▼
User: "Change the button color to blue"
  │
  ▼
Agent updates code → Canvas updates live
  │
  ▼
User: "Add a testimonials section"
  │
  ▼
Agent adds section with placeholder content
  │
  ▼
User click element in Canvas → "AI Edit: Make this real"
  │
  ▼
Agent replaces placeholder with actual content
  │
  ▼
User: "Publish to my domain myapp.com"
  │
  ▼
Agent connects domain, provisions SSL, deploys
  │
  ▼
Files saved to sandbox → Library reflects new files
```

### 6.2 Annotation Flow (Element Selection → Chat)

```
User sees element in Canvas
  │
  ▼
User clicks element
  │
  ▼
Quick Style Panel appears (inline):
  [Color] [Font] [Spacing] [Border]
  Or: "✏️ AI Edit" button
  │
  ▼
User clicks "AI Edit" or types in chat:
  "Make this section more modern"
  │
  ▼
Element reference attached to chat as context
  │
  ▼
Agent sees: [Element ref: navbar] + "Make this more modern"
  │
  ▼
Agent modifies the element → Canvas updates live
```

### 6.3 Research Workflow

```
User: "Research top 5 competitors and create a comparison"
  │
  ▼
Agent opens Browser tab
  ├── Visits competitor websites
  ├── Extracts pricing, features, reviews
  ├── Takes screenshots
  └── Compiles findings
  │
  ▼
Agent writes report → saves to sandbox → appears in Library
  │
  ▼
Right panel Browser tab shows agent navigating in real-time
User can click "Take Over" at any time
```

### 6.4 Slides Workflow

```
User: "Create a 10-slide pitch deck for our AI platform"
  │
  ▼
Agent researches → creates outline → generates slides
  ├── Content with research backing
  ├── Custom images/charts per slide
  ├── Speaker notes
  └── Consistent branding/theme
  │
  ▼
Right panel switches to Slide Mode:
  [Slides Preview] shows all slides as thumbnails
  [Editor] for direct editing
  [Themes] to change styling
  [Speaker Notes] for talking points
  │
  ▼
User can export: PPTX, PDF, Web Slides, Speaker Notes
```

---

## 7. MCP SYSTEM

### 7.1 Architecture

```
User installs MCP via MCPs section
  │
  ▼
MCP server registered in agent's tool list
  │
  ▼
When enabled (toggled ON), agent can use MCP tools
  │
  ▼
MCP tools appear as @mentions in chat input
  │
  ▼
Agent calls MCP tool → reads/writes external service
  │
  ▼
Results come back to agent → agent continues task
```

### 7.2 Types of MCPs

| Type | Examples | How to install |
|------|----------|----------------|
| Prebuilt connectors | Gmail, Notion, GitHub, Stripe | Click to enable (OAuth) |
| npm packages | `@modelcontextprotocol/server-filesystem` | `npx @modelcontextprotocol/server-filesystem` |
| Python packages | `mcp-server-github` | `pip install mcp-server-github` |
| Custom URI | `mcp://my-server/config` | Paste URI |
| Manual | Any MCP server | Configure in settings |

### 7.3 MCP vs Skills (from Manus docs)

| | MCP | Skills |
|---|---|---|
| What | Data pipelines to external services | Operating manuals/workflows |
| Purpose | Connect to external tools | Guide agent behavior |
| Examples | Gmail connector, GitHub connector | "Code Review" workflow, "Data Analysis" workflow |
| Activation | @mention or automatic | / slash command |
| State | Toggle ON/OFF | Load/unload per chat |

---

## 8. SKILL SYSTEM

### 8.1 Skill File Structure

```
skill-name.skill/
├── SKILL.md          ← Instructions (metadata + workflow)
├── references/       ← Knowledge base files
│   └── api.md
├── templates/        ← Templates
│   └── report.md
└── scripts/          ← Executable scripts
    └── validate.py
```

### 8.2 Skill Lifecycle

1. **Create**: Build with agent ("Save this workflow as a skill"), upload .zip, from GitHub, or from Official Library
2. **Store**: File-based in sandbox
3. **Activate**: In chat, type `/skill-name` → loads SKILL.md instructions
4. **Execute**: Agent follows skill workflow
5. **Edit**: Can edit SKILL.md + scripts directly
6. **Share**: Export as .skill file, upload to GitHub

### 8.3 Progressive Disclosure (from Manus docs)

| Level | Content | When Loaded | Context Cost |
|-------|---------|-------------|--------------|
| L1: Metadata | Name + description | At startup | ~100 tokens/skill |
| L2: Instructions | SKILL.md content | When triggered via / | <5k tokens |
| L3: Resources | Scripts, references | On demand | Only when used |

---

## 9. AUTOMATION / SCHEDULED TASKS

### 9.1 How Scheduling Works

```
User: "Every Monday at 8AM, research competitors and email me"
  │
  ▼
Backend creates cron job:
  - Schedule: 0 8 * * 1
  - Task: "Research top 5 competitors, find any updates, email summary"
  - Delivery: email
  │
  ▼
At scheduled time:
  Cron fires → Agent spawns in user's sandbox
  → Agent executes task autonomously
  → Results delivered to user
  → Logged in execution history
```

### 9.2 Schedule Types

| Type | Format | Example |
|------|--------|---------|
| Daily | Every day at X | "Every day at 9AM" |
| Weekdays | Mon-Fri at X | "Every weekday at 8AM" |
| Weekly | Every [day] at X | "Every Monday at 10AM" |
| Monthly | On [date] at X | "On the 1st at 9AM" |
| Custom | Flexible | "Every Tue/Thu at 2PM" |
| One-time | Single run | "Tomorrow at 3PM" |

### 9.3 Task Management

- **View**: Settings → Automation
- **Pause**: Toggle OFF temporarily
- **Edit**: Change schedule, task, output
- **Delete**: Remove permanently
- **History**: Past runs, results, errors

---

## 10. COLLABORATION

### 10.1 Sharing

- Share button on task → "Collaboration" → enter emails
- Collaborators get invite link
- Real-time: all see prompts + responses instantly
- Only task owner consumes credits
- Collaborators can prompt agent directly

---

## 11. DESKTOP / LOCAL MODE

### 11.1 Desktop App (future)

- Install desktop app → connects to local machine
- "My Computer" feature → agent accesses local files
- Explicit approval for every local command
- Folder-scoped access (only authorized directories)
- Scheduled tasks can run locally
- GPU access for ML tasks

---

## 12. RIGHT PANEL TAB REFERENCE

### 12.1 All Possible Tabs

| Tab | When Visible | What It Shows |
|-----|--------------|---------------|
| **Files** | Website/Code mode | File tree + source code explorer |
| **Canvas** | Website/Design mode | Live preview of what agent builds |
| **Browser** | Any mode (when agent browses) | Agent-controlled cloud browser |
| **Terminal** | Any mode (when agent runs commands) | Code exec output, build logs |
| **Commit** | Website/Code mode (when git used) | Git history, diff view |
| **DB** | Website mode (when database used) | Database tables, query runner |
| **Monitor** | Website mode (when deployed) | Logs, metrics, errors |
| **Domain** | Website mode (when deploying) | Custom domain connection |
| **Slides Preview** | Slide mode | All slides as thumbnails |
| **Editor** | Slide/Doc mode | Direct content editor |
| **Themes** | Slide mode | Theme selection/template upload |
| **Speaker Notes** | Slide mode | Talking points per slide |
| **Preview** | Image/Doc mode | Rendered output |
| **Design Tools** | Image mode | Mark Tool, Quick Style, Edit Text |
| **Gallery** | Image mode | All generated images |
| **Review** | Code mode | Code review/diff |
| **Lint** | Code mode | Linter output |
| **Test** | Code mode | Test results |
| **File Tree** | Doc mode | Document structure |

---

## 13. ENVIRONMENT CONFIGURATION

### 13.1 Sandbox Dockerfile

```dockerfile
FROM python:3.12-slim

# Install system deps
RUN apt-get update && apt-get install -y \
    nodejs npm git curl wget \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install openai-agents openai playwright mcp

# Set up user directories
RUN mkdir -p /home/user/{projects,images,websites,presentations,documents,downloads}
ENV HOME=/home/user
WORKDIR /home/user

# Agent entrypoint
COPY agent-runner.py /app/agent-runner.py
CMD ["python", "/app/agent-runner.py"]
```

### 13.2 Agent Runner (inside sandbox)

```python
from agents import Agent, Runner, WebSearchTool, ComputerTool, function_tool
import os

soul_md = os.environ.get("SOUL_MD", "")
agent_name = os.environ.get("AGENT_NAME", "Assistant")

agent = Agent(
    name=agent_name,
    instructions=soul_md + "\n\nYou run in a sandbox at /home/user/. Create files there.",
    tools=[
        WebSearchTool(),
        ComputerTool(),
        # Filesystem tools, code interpreter, etc.
    ]
)

# SSE endpoint receives messages, runs agent, streams back
```

---

## 14. COMPLETE FEATURE LIST (from Manus docs)

| Feature | Manus Equivalent | Our Implementation |
|---------|-----------------|-------------------|
| Chat interface | Main chat | React + SSE streaming |
| Projects | Persistent workspaces | Project CRUD + master instruction |
| Chat sessions | Tasks inside projects | Chat CRUD per project |
| MCPs | MCP Connectors + Custom MCP | MCP registry + toggle + install |
| MCP Marketplace | Link to GitHub | ``Browse GitHub`` link |
| Automation | Scheduled Tasks | Cron jobs |
| Skills | Manus Skills | File-based skills with / commands |
| Library | Generated files | Sandbox filesystem explorer |
| Canvas | Live preview | iframe/isomorphic rendering |
| Cloud Browser | Cloud Browser | Playwright in sandbox |
| Terminal | Terminal output | Output logs from sandbox |
| Files | Code Control | File explorer |
| Commit | GitHub Integration | Git history in sandbox |
| DB | Cloud Infrastructure: Database | Database explorer |
| Monitor | Cloud Infrastructure: Monitoring | Logs/metrics viewer |
| Domain | Custom Domains | DNS + SSL setup |
| Slides | Manus Slides | PPTX generation + preview |
| Design View | Design View | Image mark tool + edit |
| Multi-modal | Multimedia Processing | Image/video/audio generation |
| Research | Wide Research | Parallel research agent |
| Collaboration | Manus Collab | Share/invite to tasks |
| Desktop | Manus Desktop | Local computer access |
| Browser Operator | My Browser | Local browser extension |
| API | Manus API | REST API for external use |
| Data Sources | Data Sources | Third-party data API access |
| GitHub Integration | GitHub Integration | Two-way sync to GitHub |
| Import Figma | Import from Figma | Figma to web app |

---

## 15. DEPLOYMENT ARCHITECTURE

```
Internet
    │
    ▼
Caddy (port 443)
    │
    ├── bapx.in → Static landing page (/srv/bapx/)
    │
    └── agent.bapx.in → React app static files + /api/* proxy
            │
            ▼
    Fastify Backend (:3001)
            │
            ├── Static files (React build)
            ├── /api/auth/* (JWT, signup, login)
            ├── /api/users/* (profile, settings)
            ├── /api/projects/* (CRUD)
            ├── /api/chats/* (CRUD + SSE streaming)
            ├── /api/sandbox/* (OpenSandbox orchestration)
            ├── /api/library/* (filesystem proxy)
            ├── /api/mcp/* (MCP registry)
            ├── /api/skills/* (skill management)
            ├── /api/automation/* (cron management)
            └── /api/settings/* (all settings)
                    │
                    ▼
            OpenSandbox Server (:44772 default)
                    │
                    ▼
            Docker Sandbox per user
```

---

## 16. DATABASE SCHEMA

```sql
-- Users
users (
  id UUID PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  age DATE,
  work_study TEXT,
  bio TEXT,
  agent_name VARCHAR(128),
  password_hash VARCHAR(255),
  sandbox_id VARCHAR(128),    -- OpenSandbox ID
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Projects
projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  master_instruction TEXT,
  knowledge_base JSON,        -- array of file references
  pinned BOOLEAN DEFAULT false,
  sort_order INT,
  created_at TIMESTAMP
)

-- Chat Sessions
chats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255),
  messages JSONB,             -- array of {role, content, timestamp}
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- MCP Servers
mcp_servers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  type VARCHAR(64),           -- prebuilt | npm | pip | uri
  config JSON,                -- server-specific config
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP
)

-- Scheduled Tasks
scheduled_tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  prompt TEXT,
  schedule VARCHAR(128),      -- cron expression
  output_method VARCHAR(64),  -- email | slack | file | etc
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMP,
  created_at TIMESTAMP
)

-- Skills
skills (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  source VARCHAR(64),         -- builtin | uploaded | github | chat
  skill_data JSONB,           -- SKILL.md + files
  created_at TIMESTAMP
)
```

---

## 17. MEMORY

- Persistent memory is stored in the sandbox
- Memory tool saves facts about user preferences, environment, conventions
- SOUL.md provides base context (agent name, user name, bio)
- Memory builds on top of SOUL.md as agent learns user patterns
- Users can view/delete memory entries in Settings → Memory
- Session logs in Settings → Session Logs

---

## 18. KEY DESIGN PRINCIPLES

1. **Library = sandbox filesystem.** No separate storage. Agent creates files → they're in the sandbox → Library browses them.

2. **Right panel is context-dependent.** Building a website? See Files/Canvas/Browser/Terminal/Commit/DB/Monitor/Domain. Making slides? See Preview/Editor/Themes/Notes.

3. **MCP + Skills are different.** MCPs = data connections (toggle ON/OFF). Skills = workflows (activate via /).

4. **Projects organize everything.** Projects have master instructions + knowledge base. Chats live inside projects. Files go under project directories.

5. **Agent runs in sandbox.** Each user gets an isolated Docker sandbox. OpenAI Agents SDK runs inside. The sandbox has Python, Node.js, Playwright.

6. **Everything is file-based.** Skills are SKILL.md files. MCPs are config files. Projects are database entries with file references. No magic auto-save.

7. **Stream everything.** Chat streams SSE. Right panel updates in real-time. Canvas shows live preview. Terminal shows live output.

---

*End of Knowledge Graph — Start building from this document.*
