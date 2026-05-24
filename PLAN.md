# bapX — Implementation Plan

## Goal
Build the complete bapX agent platform dashboard — pure HTML/CSS/JS, single-page application served by Python FastAPI.

## Deliverables

### 1. Backend (DONE — /root/Dev/bapx/backend.py)
- [x] User auth (signup/login with JWT)
- [x] All model providers (API key + OAuth device flow)
- [x] Skills API (all default skills)
- [x] Chat streaming via SSE
- [x] Session management
- [x] Health endpoint

### 2. Frontend — Build this with Codex CLI
The main deliverable. A single `/root/Dev/bapx/static/dashboard.html` file containing:

#### Layout
- **3-column** layout (Manus.im style):
  - Left sidebar (w-72 desktop, w-12 icon rail mobile)
  - Center chat area
  - Right panel (Canvas/Browser/Terminal tabs)
- **Mobile responsive**: sidebar is always w-12 icon rail on mobile, expands to w-72 on tap with backdrop overlay. State persisted in localStorage.

#### Pages/Views (all SPA, hash-based routing)

**Login Page (#login)**
- Email + password fields
- Submit to POST /api/login
- On success: store JWT, redirect to #dashboard

**Signup Page (#signup)**
- Username, Name, Email, Password, Age, Agent Name, Bio fields
- Submit to POST /api/signup
- On success: store JWT, redirect to #dashboard

**Dashboard (#dashboard)**
- 3-column layout with chat interface
- Chat messages displayed with streaming support
- Input bar at bottom
- Session list in sidebar
- User avatar/name at bottom of sidebar

**Settings View (within dashboard)**
Two sections accessible from sidebar:

1. **Model Connection**
   - API Key providers: dropdown of 18+ providers + input field for key + model dropdown
   - OAuth providers: buttons for each → "Connect with ChatGPT", "Connect with Claude", etc.
   - OAuth device flow UI: show user_code + verification_uri, poll for completion
   - Copilot: GitHub login flow
   - Current connection status shown

2. **Skills Browser**
   - Grid/list of all available skills
   - Search/filter by name or category
   - Toggle/check to enable a skill
   - Save selection to POST /api/user/skills

#### Tech constraints
- NO external JS frameworks (no React, no Vue, no Alpine, no jQuery)
- NO bundlers or build steps
- Pure vanilla JavaScript (ES modules OK)
- CSS in <style> tags or inline
- Dark theme throughout (#0f0f13 background, #e0e0e0 text, #9651b8 accent)
- Inter font from Google Fonts
- All API calls use fetch() with Bearer token from localStorage
- No Hermes branding anywhere

### 3. Deploy
- [ ] Restart backend (python backend.py)
- [ ] Verify all pages load
- [ ] Git push

## Build Order
1. Login + Signup pages (standalone, full flow)
2. Dashboard layout (3-column, sidebar, chat area, right panel)
3. Chat functionality (send message, stream response)
4. Settings — Model Connection (API key + OAuth)
5. Settings — Skills Browser
6. Mobile responsive sidebar
7. Verify everything works
