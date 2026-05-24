---
title: Frontend Architecture
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [frontend, ui, mobile, responsive, dashboard]
confidence: high
---

# Frontend Architecture

Pure HTML/CSS/JS SPA served via FastAPI mount.

## Layout (3-column Manus-style)
Left sidebar (48px icon rail, expands to 240px) | Center chat | Right panel (Flow/Browser/Terminal)

## Mobile Responsive
- Sidebar: always 48px icon rail, expands on tap with backdrop
- Content: `margin-left: 48px` offset for fixed sidebar
- Right panel: full-width overlay when open
- OAuth grid: 2-column on mobile
- Skills grid: 1-column on mobile

## Views
- Chat — streaming messages with agent
- Projects — project management
- Deploy — website publishing, custom domains, deployments
- Integrations — git repos, mail inbox, Slack
- Settings — Connection (API keys + OAuth), Account (profile, billing)

## Browser Preview (Right Panel)
- "Browser" tab with URL bar + iframe
- Connects to sandbox's CDP endpoint via backend proxy
- Future: annotation mode — click on iframe → coordinates → CDP element → chat

## Terminal Preview (Right Panel)
- "Terminal" tab with terminal output + input
- Commands sent to sandbox via `/api/sandbox/exec`

## File Structure
```
static/
  index.html     — Landing page
  dashboard.html — SPA (all views in one HTML file)
  dashboard.css  — All styles (~290 lines)
  dashboard.js   — All JS (~1100 lines)
```

## OAuth Modal
Pop-up window for provider OAuth flow with polling.
Device code flow: user_code + verification_uri displayed, polling every 3s.
