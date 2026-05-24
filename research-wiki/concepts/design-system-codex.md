---
title: Codex macOS Design System Deep Dive
type: concept
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, codex, design-system]
cross-refs: [codex-macos, manus-vs-codex-ui]
---

# Codex macOS Design System Deep Dive

> Design token analysis for the Codex macOS desktop application.
> Based on OpenAI Codex SDK references and desktop app observations.

---

## 1. Color Palette

### 1.1 Background Colors

| Token | Value (approx) | Usage |
|-------|----------------|-------|
| Main background | `#1a1a1a` | Primary window background |
| Secondary background | `#212125` | Sidebar, panels |
| Card/Container bg | `#2a2a2e` | Chat bubbles, cards, containers |
| Input background | `#2a2a2e` | Text input area |
| Terminal background | `#0d0d0d` or `#1a1a1a` | Terminal output area |
| Sidebar rail | `#1a1a1a` | 48px collapsed sidebar |
| Hover state | `rgba(255,255,255,0.05)` | Subtle hover highlight |
| Active state | `rgba(255,255,255,0.1)` | Active/selected items |

### 1.2 Text Colors

| Token | Value (approx) | Usage |
|-------|----------------|-------|
| Primary text | `#e8e8f0` | Main body text, headings |
| Secondary text | `#a0a0b0` | Supporting text, descriptions |
| Tertiary text | `#6c6c7a` | Muted labels, timestamps |
| Disabled text | `#4a4a55` | Inactive elements |
| Accent text on blue | `#ffffff` | Buttons with accent bg |
| Input text | `#e8e8f0` | Typed text in input |

### 1.3 Accent & Interactive Colors

| Token | Value | Usage |
|-------|-------|-------|
| Accent blue | `#0081f2` | Primary buttons, links, active indicators, typing dots |
| Accent highlight | `rgba(0,129,242,0.2)` | Selected items, active states |
| Error/Delete | `#f25a5a` | Error messages, delete actions |
| Success | `#25ba3b` | Success indicators, status |
| Warning | `#f5a623` | Warning states |
| Terminal green | `#00ff00` or `#4af626` | Terminal output text |

### 1.4 Border & Divider Colors

| Token | Value (approx) | Usage |
|-------|----------------|-------|
| Subtle divider | `rgba(255,255,255,0.06)` | Between columns, messages |
| Standard border | `rgba(255,255,255,0.1)` | Card borders, panel edges |
| Input border | `rgba(255,255,255,0.15)` | Input field border |
| Input focus | `#0081f2` or `rgba(0,129,242,0.5)` | Focused input state |
| Active tab | `#0081f2` (underline) | Active tab indicator |

### 1.5 Shadow Colors

| Token | Value | Usage |
|-------|-------|-------|
| Drop shadow | `rgba(0,0,0,0.3)` | Modal/popup shadows |
| Card shadow | `rgba(0,0,0,0.2)` | Elevated cards |
| Tooltip shadow | `rgba(0,0,0,0.4)` | Tooltips, dropdowns |

## 2. Typography System

### 2.1 Font Stack

```
Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text",
"Helvetica Neue", Arial, sans-serif
```

Primary: **Inter** — open-source variable font designed for screens
Fallback: Apple system fonts (SF Pro), Helvetica Neue, Arial

For monospace:
```
"SF Mono", "JetBrains Mono", "Cascadia Code", "Fira Code",
monospace
```

### 2.2 Type Scale

| Level | Size | Weight | Line-Height | Usage |
|-------|------|--------|-------------|-------|
| Chat heading | 18px | 600 (semibold) | 24px | Conversation title, section heads |
| Body / Chat text | 15-16px | 400 (regular) | 22-24px | Message content |
| Secondary text | 13-14px | 400 (regular) | 18-20px | Timestamps, metadata |
| Code / Terminal | 13-14px | 400 (regular) | 18-20px | Code blocks, terminal output |
| Labels | 12-13px | 500 (medium) | 16px | Tab labels, button text |
| Status | 11-12px | 400 (regular) | 14px | Status indicators, file sizes |

### 2.3 Font Weights

| Weight | Usage |
|--------|-------|
| 400 (Regular) | Body text, message content, terminal output |
| 500 (Medium) | Labels, buttons, tab text, section headers |
| 600 (Semibold) | Headings, conversation titles |
| 700 (Bold) | Emphasis within messages |

## 3. Spacing & Layout Grid

### 3.1 Base Spacing Unit

```
Base unit: 4px (common macOS pattern)
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48
```

### 3.2 Column Widths

| Column | Width (collapsed) | Width (expanded) |
|--------|-------------------|------------------|
| Left sidebar | 48px (rail only) | 200-240px |
| Center (chat) | Flexible | Fill remaining |
| Right panel | 320-400px | Same when visible |

### 3.3 Key Spacing Values

| Element | Value |
|---------|-------|
| Container padding | 16px |
| Message gap | 12px between bubbles |
| Sidebar padding | 8px horizontal |
| Input area padding | 12px 16px |
| Icon size (sidebar) | 24x24px |
| Border radius (standard) | 8px |
| Border radius (large) | 12px |
| Border radius (small) | 6px |

## 4. Component Styling

### 4.1 Chat Bubble System

#### User Message Bubble
```
background-color: #0081f2 (accent)
color: #ffffff
border-radius: 12px 12px 4px 12px (top-left, top-right, bottom-right, bottom-left)
padding: 10px 14px
max-width: 70-80% of container
margin-left: auto (right-aligned)
```

#### Assistant Message Bubble
```
background-color: #2a2a2e
color: #e8e8f0
border-radius: 12px 12px 12px 4px (top-left, top-right, bottom-right, bottom-left)
padding: 10px 14px
max-width: 85-90% of container
margin-right: auto (left-aligned)
```

#### Code Block (inside assistant bubble)
```
background-color: #1a1a1a (darker than bubble)
font-family: monospace
font-size: 13px
border-radius: 6px
padding: 12px 16px
margin: 8px 0
border: 1px solid rgba(255,255,255,0.06)
header: language label + copy button
```

#### Tool Call Card (inside assistant bubble)
```
background-color: #212125
border-radius: 8px
border: 1px solid rgba(255,255,255,0.06)
padding: 8px 12px
collapsible: click header to expand/collapse
header: icon + tool name + status indicator + duration
```

### 4.2 Input Area
```
background-color: #2a2a2e
border: 1px solid rgba(255,255,255,0.15)
border-radius: 12px
padding: 12px 16px
font-size: 15px
color: #e8e8f0
placeholder: "Ask anything..." (color: #6c6c7a)
```

### 4.3 Sidebar Icon Rail
```
width: 48px
background: transparent or #1a1a1a
icons: 24x24px, centered
icon color: #a0a0b0 (default), #e8e8f0 (active/hover)
spacing: 12px between icons
bottom: user avatar (32px circle)
```

### 4.4 Tab System (Right Panel)
```
tab height: 36px
tab label: 13px, 500 weight
active tab: accent underline (#0081f2) or accent bg
inactive tab: #a0a0b0 text
```

### 4.5 Terminal Panel
```
background-color: #0d0d0d or #1a1a1a
color: #e8e8f0 or terminal green
font-family: monospace
font-size: 13px
padding: 16px
overflow: scroll
```

## 5. Animation & Micro-interactions

### 5.1 Typing Indicator
- **Style**: 3 bouncing dots
- **Color**: accent blue (#0081f2) or light gray
- **Sequence**: Dots animate up and down with staggered timing
- **Duration**: ~1.2s per bounce cycle
- **Placement**: Bottom of chat area, left-aligned (assistant side)

### 5.2 Message Appearance
- New messages fade/slide in
- Duration: ~200-300ms
- Easing: ease-out

### 5.3 Sidebar Expand/Collapse
- Smooth width transition (48px ↔ 240px)
- Duration: ~200ms
- Icons fade in labels as panel expands

### 5.4 Panel Toggle
- Right panel slides in/out
- Duration: ~200-250ms
- Content within panel transitions with the container

### 5.5 Hover States
- Subtle background lightening: `rgba(255,255,255,0.05)`
- Duration: ~150ms
- Applied to: nav items, buttons, clickable elements

## 6. Design System Summary

### Philosophy
The Codex macOS design system is **dark, functional, and developer-focused**:
- **Dark theme reduces eye strain**: Essential for developer tools used for hours
- **Utilitarian aesthetic**: Every element has a purpose; minimal decoration
- **Information density balance**: Chat keeps readability high; panels pack detail
- **Accent consistency**: Single blue accent across interactive elements
- **Code-aware typography**: Monospace for code, readable sans for conversation

### Key Design Decisions
1. **Dark as default**: Sets developer tool context immediately
2. **Bubble asymmetry**: Different border-radius on each corner creates "speech bubble" feel
3. **Sidebar icon rail**: Saves screen real estate while providing full navigation
4. **Three-panel windowing**: Combines chat, tools, and output in one cohesive view
5. **Right panel as Swiss Army knife**: Three functions (flow/browser/terminal) in one panel slot
6. **Inter font**: Open-source, screen-optimized, cross-platform consistency
