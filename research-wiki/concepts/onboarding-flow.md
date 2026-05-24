---
title: Onboarding & Walkthrough Comparison
type: concept
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, manus.im, codex, onboarding]
cross-refs: [manus-im, codex-macos, manus-vs-codex-onboarding]
---

# Onboarding & Walkthrough Comparison

> Analyzing how Manus.im (web SaaS) and Codex macOS (desktop app) handle first-run experiences.

---

## 1. Platform Context Differences

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| Platform | Web browser (SaaS) | macOS desktop (native) |
| Auth required | Yes (email/password or OAuth) | API key or OAuth |
| First visit | Marketing site → App | Download → Install → Launch |
| Target user | Business professionals | Developers |
| Context | Cloud-based, no local install | Desktop app with local execution |

## 2. Manus.im Onboarding Flow

### 2.1 Entry Point
- **Landing page**: Full marketing site experience
- **First impression**: Hero with serif headline "What can I do for you?"
- **Top banner**: Meta acquisition announcement
- **No registration wall**: Users can see the value proposition immediately

### 2.2 Discovery Path
1. **Read headline**: "Less structure, more intelligence"
2. **View suggestion chips**: "Create slides", "Build website", "Develop desktop apps", "Design", "More"
3. **Optional scroll**: Explore feature sections below fold
4. **CTA engagement**: Click suggestion chip or type in search input
5. **Auth gate**: Registration required at point of action

### 2.3 Sign-up Flow (Inferred)
```
Click "Sign up" → 
  Email/password form or OAuth options →
  (GitHub, Google, Microsoft, etc.) →
  Confirm email →
  Redirect to application dashboard →
  First-run experience in app
```

### 2.4 Post-Auth First Run
- Likely an empty state dashboard
- Suggestion chips or guided prompts for first task
- Possibly a walkthrough/tutorial overlay
- Task-oriented: "Create your first agent", "Assign a task"

### 2.5 Key Onboarding Patterns
- **Hero-driven discovery**: Users learn by doing (typing tasks, clicking suggestions)
- **Progressive disclosure**: Marketing content first, auth only when needed
- **Suggestion chips lower barrier**: Users don't need to know what to ask
- **Feature browsing**: Below-fold content educates without commitment
- **Serif typography sets tone**: Refined, professional, "intelligent"

## 3. Codex macOS Onboarding Flow

### 3.1 Entry Point
- **Download**: From OpenAI/Codex website
- **Install**: Standard macOS DMG/pkg installation
- **First launch**: System permissions dialogs (accessibility, files, etc.)
- **Auth**: API key configuration or OAuth login

### 3.2 First Launch Experience
1. **Launch animation**: App icon bouncing in dock (macOS standard)
2. **Permissions prompt**: Accessibility API (for automation), file system access
3. **API key setup**: Text field to enter OpenAI API key or OAuth flow
4. **Dashboard loading**: Three-column layout appears
5. **Empty state**: Welcome message in center column
6. **Tool discovery**: Welcome message explaining capabilities

### 3.3 In-App Onboarding

#### Center Column (Chat)
- Welcome message from assistant
- Suggested prompts/sample queries
- "Try asking me to..." suggestions
- Quick start tips

#### Left Sidebar
- Default navigation items visible
- "New Chat" button prominent
- Recent sessions list (empty initially)

#### Right Panel (Flow)
- "Getting Started" entries
- Setup completion checklist
- Activity stream starts empty, fills as user interacts

### 3.4 First Interaction Flow
```
See welcome message →
  Read suggested prompts →
  Type first query (e.g., "Create a Python script that...") →
  Watch typing indicator →
  Receive response with tool calls →
  See Flow panel populate with activities →
  See Terminal panel show commands →
```

### 3.5 Key Onboarding Patterns
- **Permissive first run**: Welcome message rather than tutorial overlay
- **Learning by doing**: Users discover features through interaction
- **Immediate value**: No registration wall for local use (API key only)
- **Panel discovery**: Each interaction populates different panels, teaching the layout
- **Developer-oriented**: Technical setup (API key) is upfront

## 4. Comparison Summary

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **First impression** | Marketing hero with serif typography | Dark dashboard with welcome message |
| **Auth friction** | Sign-up required for full use | API key setup (developer-expected) |
| **Learning model** | Progressive: marketing → suggestion → action | Immediate: welcome → query → discovery |
| **Guidance style** | Suggestion chips and search placeholder | Welcome message and suggested prompts |
| **Empty states** | Likely guided prompts in app | Welcome message with sample queries |
| **Technical depth** | Low (business user friendly) | Medium (expects developer familiarity) |
| **Layout exposure** | Users see app after auth | Users see full layout from launch |
| **Time to value** | ~3 steps (land → suggest → auth → act) | ~2 steps (setup → ask) |

## 5. Key Observations

1. **Manus.im uses marketing-first onboarding** because it's a web SaaS — it needs to sell before users commit
2. **Codex macOS uses action-first onboarding** because users have already downloaded a desktop app — they're committed
3. **Both use suggestion chips/prompts** to reduce the "blank page" problem — giving users a starting point
4. **Manus.im has higher auth friction** but richer pre-auth marketing content
5. **Codex macOS has lower time-to-value** once the app is installed
6. **Neither uses video tutorials or multi-step walkthrough overlays** — both favor learning by doing
7. **The dark theme of Codex vs light theme of Manus** reinforces their different contexts (developer tool vs business SaaS)
