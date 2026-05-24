---
title: 3-Column Layout Analysis
type: concept
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, manus.im, codex, layout]
cross-refs: [manus-im, codex-macos, manus-vs-codex-ui]
---

# 3-Column Layout Analysis

> Comparing the three-column layout architecture used in Manus.im (web SaaS) and Codex macOS (desktop app).
> Both platforms converge on a similar three-column pattern despite different platforms and use cases.

---

## 1. Layout Overview

Both Manus.im and Codex macOS use a **three-column layout** as their primary application UI structure, though the implementation details differ significantly due to platform constraints.

## 2. Manus.im Layout (Web Application)

### 2.1 Structural Diagram

```
┌────────────┬─────────────────────────────────┬────────────────┐
│  Sidebar   │        Main Content Area        │  Right Panel   │
│  (48px)    │        (Flexible Width)         │  (320-400px)   │
│            │                                  │                │
│  Icons     │  Chat / Task Interface           │  Context /     │
│  + Expand  │                                  │  Activity      │
│  (~240px)  │  Search Input at Top             │                │
│            │  (for task entry)                │  Toggle:       │
│  User      │                                  │  show/hide     │
│  Avatar    │  Suggestions / Features          │                │
└────────────┴─────────────────────────────────┴────────────────┘
```

### 2.2 Column Breakdown

#### Left Sidebar
| Aspect | Details |
|--------|---------|
| Width | 48px (collapsed icon rail) |
| Expanded | ~200-240px (shows labels) |
| Top | Logo |
| Middle | Nav items with icons |
| Bottom | User avatar + settings |
| Behavior | Click/hover to expand |

#### Center Column
| Aspect | Details |
|--------|---------|
| Width | Flexible (fills space between sidebars) |
| Content | Chat/task interface |
| Top | Conversation header |
| Middle | Message list or task display |
| Bottom | Input area (task assignment) |
| Hero | Search input with suggestions |

#### Right Panel
| Aspect | Details |
|--------|---------|
| Width | 320-400px |
| Content | Context, activity stream |
| Tabs | Flow / Browser / Terminal |
| Visibility | Toggle show/hide |
| Default | Visible or hidden based on preference |

### 2.3 Responsive Behavior

- **Desktop (>1024px)**: Full three-column layout
- **Tablet (768-1024px)**: Right panel may auto-hide, sidebar stays
- **Mobile (<768px)**: Sidebar collapses to overlay with backdrop, right panel hidden, single column content

## 3. Codex macOS Layout (Desktop App)

### 3.1 Structural Diagram

```
┌────────────┬─────────────────────────────────┬────────────────┐
│  Left      │        Center Column            │  Right Panel   │
│  Sidebar   │        (Chat Area)              │  (Context)     │
│  48px      │                                  │                │
│  icon rail │  Messages (scrollable)           │  Flow:         │
│  + expand  │                                  │  Activity log  │
│            │  ┌──────────────────────────┐    │                │
│  Logo      │  │ User bubble (right, acc) │    │  Browser:      │
│  Nav icons │  │ Assistant (left, dark)   │    │  WebView       │
│  User av   │  │ Code blocks, tool calls  │    │                │
│            │  └──────────────────────────┘    │  Terminal:     │
│            │                                  │  Shell output  │
│            │  Input area (bottom)             │                │
│            │  "Ask anything..."               │  Toggle:       │
│            │                                  │  show/hide     │
└────────────┴─────────────────────────────────┴────────────────┘
```

### 3.2 Column Breakdown

#### Left Sidebar
| Aspect | Details |
|--------|---------|
| Width | 48px (collapsed icon rail) |
| Expanded | 200-240px |
| Top | Application logo |
| Middle | Navigation icons |
| Bottom | User avatar with status |
| Behavior | Click to expand/collapse |

#### Center Column
| Aspect | Details |
|--------|---------|
| Width | Flexible |
| Content | Conversation chat |
| Top | Session/conversation header |
| Middle | Message history (scrollable) |
| Bottom | Input area with send button |
| Default | Fills available width |

#### Right Panel
| Aspect | Details |
|--------|---------|
| Width | 320-400px |
| Content | Context panel (3 tabs) |
| Tabs | **Flow**: Activity stream with tool calls, file changes, events |
| | **Browser**: CDP-based in-app browser |
| | **Terminal**: Shell output with command history |
| Toggle | Button in center column header |

### 3.3 Window Management

- **Resizable**: Window sizes freely
- **Minimum width**: ~900px for three-column comfort
- **Responsive**: Right panel auto-hides if window too narrow
- **macOS native**: Standard window controls (traffic lights), full-screen support

## 4. Structural Comparison

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| Platform | Web (HTML/CSS/JS) | macOS native (AppKit/SwiftUI) |
| Sidebar width | 48px → ~240px | 48px → ~240px |
| Sidebar trigger | Click/hover | Click |
| Center column | Chat/task input | Chat/messages |
| Right panel width | 320-400px | 320-400px |
| Right panel content | Flow/Browser/Terminal | Flow/Browser/Terminal |
| Right panel toggle | Yes | Yes |
| Responsive handling | CSS media queries | Native window sizing |
| Mobile adaptation | Full responsive redesign | N/A (desktop only) |

## 5. Shared Patterns

### 5.1 Icon Rail Pattern
Both platforms use a **48px collapsed sidebar icon rail** — a pattern borrowed from:
- macOS Finder sidebar
- Xcode navigator
- Notion sidebar
- Discord channel list
- Slack workspace switcher

Benefits:
- Saves horizontal space
- Quick visual navigation
- Expandable for labels
- Familiar UI pattern

### 5.2 Right Panel as Context Canvas
Both platforms dedicate the right third to **secondary context**:
- Activity/event stream
- Additional tools (browser, terminal)
- Supplementary information
- Toggle on/off as needed

### 5.3 Center Column Priority
Both platforms make the center column the **primary interaction zone**:
- Chat/task input is central
- Main content always visible
- Side panels are supplementary

## 6. Key Differences

### 6.1 Platform Constraints
- **Manus.im** (web): Must handle responsive breakpoints, touch devices, browser chrome
- **Codex macOS** (native): Consistent window size, keyboard shortcuts, macOS native controls

### 6.2 Content Focus
- **Manus.im**: Task/action oriented — search input at top, suggestions below
- **Codex macOS**: Conversation oriented — chat bubbles, typing indicator, message history

### 6.3 Right Panel Default State
- **Manus.im**: Right panel may start hidden or visible based on user preference
- **Codex macOS**: Right panel typically visible by default, especially Flow tab

### 6.4 Mobile Strategy
- **Manus.im**: Full responsive redesign for mobile (sidebar becomes overlay)
- **Codex macOS**: Desktop-only; no mobile version

## 7. Design Rationale

The convergence on a **three-column layout** by both platforms reflects a shared design insight:

> **Sidebar for navigation + Center for primary action + Right panel for context = optimal balance of focus and information density**

This pattern:
1. Keeps navigation always accessible (left)
2. Gives maximum attention to the primary task (center)
3. Provides surrounding context without leaving the view (right)
4. Allows users to control information density (panel toggle)
5. Scales from focused (single column) to full (three columns)
