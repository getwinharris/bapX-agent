---
title: Codex macOS Desktop Design System
type: concept
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, codex, design-system, desktop-app]
cross-refs: [codex-macos, codex-desktop-app-protocol]
---

# Codex macOS Desktop Design System

> Design token analysis extracted from the actual Codex desktop application source code.
> Sources: `/root/Dev/bapx/bapX-src/codex-rs/login/src/assets/success.html`, `error.html`, app-server protocol JSON schemas, desktop app launcher.

---

## 1. Color Palette

Extracted from the actual CSS in the Codex login HTML pages (`success.html`). These are the only confirmed design tokens in the codebase.

### 1.1 Gray Scale (Base Tokens)

```css
/* CL Light (default) / CL Dark (prefers-color-scheme: dark) */
--gray-0:    #ffffff;   /* Dark: unchanged */
--gray-50:   #f9f9f9;   /* Dark: unchanged */
--gray-100:  #ededed;   /* Dark: unchanged */
--gray-150:  #dfdfdf;   /* Dark: unchanged */
--gray-300:  #afafaf;   /* Dark: unchanged */
--gray-500:  #5d5d5d;   /* Dark: unchanged */
--gray-900:  #181818;   /* Dark: unchanged */
--gray-1000: #0d0d0d;   /* Dark: unchanged */
```

### 1.2 Semantic Tokens (Light Mode — DEFAULT)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background-surface` | `#ffffff` | Window/page background |
| `--color-text-foreground` | `#0d0d0d` | Primary text |
| `--color-border` | `rgb(13 13 13 / 10%)` | Subtle borders |
| `--color-button-background` | `#ffffff` | Button surface |
| `--color-button-background-hover` | `#f9f9f9` | Button hover |
| `--color-button-border` | `#ededed` | Button border |
| `--color-button-border-hover` | `#dfdfdf` | Button border hover |
| `--interactive-label-secondary-default` | `#0d0d0d` | Button label |
| `--text-secondary` | `#5d5d5d` | Secondary text |

### 1.3 Semantic Tokens (Dark Mode)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background-surface` | `#181818` | Window/page background |
| `--color-text-foreground` | `#ffffff` | Primary text |
| `--color-border` | `rgb(255 255 255 / 8%)` | Subtle borders |
| `--color-button-background` | `rgb(255 255 255 / 5%)` | Button surface |
| `--color-button-background-hover` | `rgb(255 255 255 / 8%)` | Button hover |
| `--color-button-border` | `rgb(255 255 255 / 8%)` | Button border |
| `--color-button-border-hover` | `rgb(255 255 255 / 16%)` | Button border hover |
| `--interactive-label-secondary-default` | `#afafaf` | Button label |
| `--text-secondary` | `rgb(255 255 255 / 65%)` | Secondary text |

### 1.4 Color System Summary

| Role | Light (default) | Dark |
|------|-----------------|------|
| Page background | `#ffffff` | `#181818` |
| Surface/card bg | `#ffffff` | `#181818` |
| Primary text | `#0d0d0d` | `#ffffff` |
| Secondary text | `#5d5d5d` | `rgb(255 255 255 / 65%)` |
| Borders (subtle) | `rgb(13 13 13 / 10%)` | `rgb(255 255 255 / 8%)` |
| Button bg (default) | `#ffffff` | `rgb(255 255 255 / 5%)` |
| Button bg (hover) | `#f9f9f9` | `rgb(255 255 255 / 8%)` |
| Button border | `#ededed` | `rgb(255 255 255 / 8%)` |

**Important**: The default mode is LIGHT, with dark mode triggered by `prefers-color-scheme: dark`. This is a macOS-native approach that respects the system appearance setting.

---

## 2. Typography System

### 2.1 Font Stack (Confirmed)

```css
--font-use: "SF Pro", ui-sans-serif, system-ui, -apple-system,
             BlinkMacSystemFont, "Segoe UI", sans-serif;
```

- **Primary**: Apple SF Pro (system font on macOS)
- **Fallback stack**: Cross-platform system fonts
- **No Inter font confirmed** — SF Pro is the designed typeface

### 2.2 Type Scale (From Login Pages)

| Element | Size | Weight | Letter-Spacing | Line-Height |
|---------|------|--------|----------------|-------------|
| Wordmark (header) | 21px | 650 | -0.45px | 24px |
| Body/message | 14px | 400 | -0.18px | 20px |
| Button label | 14px | 510 | -0.154px | 20px |
| Setup title | 14px | 510 | — | 20px |
| Setup description | 14px | 400 | — | 20px |
| Error page heading | 28px | — | — | 1.2 |
| Error message | 16px | — | — | 1.45 |
| Error details | 13px | — | — | — |
| Error help | 14px | — | — | — |

### 2.3 Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| 400 (Regular) | `normal` | Body text, descriptions |
| 510 (Medium-Semi) | `510` | Button labels, titles |
| 650 (Semi-Bold) | `650` | Wordmark/logo text |

Note: `510` is an unusual weight — sits between Medium (500) and Semi-Bold (600). This is common in Apple's SF Pro font which has 9 weights.

---

## 3. Spacing & Layout

### 3.1 Spacing Values (From Login Pages)

| Context | Value | Notes |
|---------|-------|-------|
| Wordmark position | top: 18px, left: 20px | Fixed header |
| Main padding | 56px 24px | Vertical/horizontal page padding |
| Content max-width | 560px | Centered card width |
| Content gap | 32px | Between elements vertically |
| Button padding | 8px 16px 8px 14px | Top/right/bottom/left |
| Button min-height | 36px | Touch target |
| Button gap (icon+text) | 8px | Between SVG and label |
| Card padding | 16px 20px | Setup box internal spacing |
| Card border-radius | 16px | Large card |
| Card margin-bottom | 4px | Between title and description |
| Favicon size | 32px | SVG viewBox |
| Logo size (in card) | 40px box, 10px radius | Error page brand |
| Detail row grid | 136px 1fr | Key-value layout |
| Detail card gap | 8px | Between rows |

### 3.2 Error Page Layout

```
┌────────────────────────────────────┐
│  [Logo] Codex login                │  ← brand-row, gap 12px
│                                    │
│  Error Title (28px)                │  ← margin 18px top, 10px bottom
│  Error message (16px)              │
│                                    │
│  ┌──────────────────────────────┐  │  ← border-radius: 12px
│  │ Error code     value         │  │
│  │ Details        value         │  │  ← background: #fafafa
│  └──────────────────────────────┘  │  ← margin-top: 18px
│                                    │
│  Help text (14px, #5d5d5d)        │  ← margin-top: 16px
└────────────────────────────────────┘
  border-radius: 16px
  border: 1px solid rgba(13,13,13,0.12)
  box-shadow: 0 12px 32px rgba(0,0,0,0.06)
  background: #ffffff
  padding: 24px
  width: min(680px, 100%)
```

---

## 4. Component Styling

### 4.1 Buttons

**Default State:**
```css
min-height: 36px
display: inline-flex
align-items: center
justify-content: center
gap: 8px
border: 1px solid var(--color-button-border)
border-radius: 999px  /* Full rounded / pill shape */
background: var(--color-button-background)
color: var(--interactive-label-secondary-default)
font-size: 14px
font-weight: 510
letter-spacing: -0.154px
line-height: 20px
padding: 8px 16px 8px 14px
```

**Hover State:**
```css
background: var(--color-button-background-hover)
border-color: var(--color-button-border-hover)
```

**Focus Visible:**
```css
outline: 2px solid var(--color-text-foreground)
outline-offset: 3px
```

### 4.2 Cards

**Setup Box Card:**
```css
width: min(100vw - 32px, 560px)
padding: 16px 20px
border: 1px solid var(--color-border)
border-radius: 16px
text-align: left
```

**Error Card:**
```css
width: min(680px, 100%)
border-radius: 16px
border: 1px solid rgba(13, 13, 13, 0.12)
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06)
background: #ffffff
padding: 24px
```

### 4.3 Detail Grid (Error Page)

```css
display: grid
gap: 8px
padding: 14px
border-radius: 12px
border: 1px solid rgba(13, 13, 13, 0.1)
background: #fafafa
```

Rows: `grid-template-columns: 136px 1fr`, `gap: 10px`, `font-size: 13px`

### 4.4 Logo / Brand Mark

**Codex Logo SVG** (stylized "C" with bracket):
```svg
<path d="M22.356 19.797H17.17M9.662 12.29l1.979 3.576a.511.511 0 0 1-.005.504l-1.974 3.409M30.758 16c0 8.15-6.607 14.758-14.758 14.758-8.15 0-14.758-6.607-14.758-14.758C1.242 7.85 7.85 1.242 16 1.242c8.15 0 14.758 6.608 14.758 14.758Z"/>
```

Used as:
- Favicon (32×32 viewBox)
- In-app button icon (20×20 in success page)
- Login card logo (24×24 in error page)

### 4.5 Wordmark / Header

```
"ChatGPT" wordmark
position: fixed
top: 18px
left: 20px
font-size: 21px
font-weight: 650
letter-spacing: -0.45px
line-height: 24px
```

---

## 5. Error Page Specific Styling

| Element | Style |
|---------|-------|
| Body background | `radial-gradient(circle at top, #f7f8fb 0%, #ffffff 48%)` |
| Brand logo box | 40×40px, border-radius: 10px, border: 1px solid rgba(0,0,0,0.1) |
| Brand title | 14px, color: `#5d5d5d` |
| Brand gap | 12px (logo + title) |
| Heading (h1) | 28px, margin: 18px 0 10px, line-height: 1.2 |
| Error message | 16px, line-height: 1.45 |
| Detail card | `#fafafa` bg, border-radius: 12px |
| Detail label | color: `#5d5d5d` |
| Code text | `ui-monospace, SFMono-Regular, Menlo, Monaco, ...` |
| Help text | 14px, color: `#5d5d5d`, margin-top: 16px |

---

## 6. UI Component Library (From Protocol Analysis)

These components are implied by the app-server protocol message types:

### 6.1 Chat Components
- **Message bubble** — streaming text via `agent/message/delta`
- **Reasoning panel** — expandable/collapsible via `reasoning/textDelta`
- **Diff viewer** — color-coded inline diff via `fileChange/patch/updated`
- **Code block** — monospace rendering (assumed, standard for chat)
- **Plan steps** — progress indicator via `plan/delta`, `turn/plan/updated`

### 6.2 Approval Dialog Types
- **Command Approval Dialog**: Shows command text, action type, permissions requested, with 5 response options
- **File Change Approval Dialog**: Shows file paths, diff preview, grant root request
- **Permissions Approval Dialog**: Shows filesystem paths with access modes, network access toggle, granular per-dimension approval
- **User Input Form**: Dynamic form with text inputs, secret (masked) fields, single/multi-select options
- **Patch Approval Dialog**: Shows file diffs with add/delete/update indicators

### 6.3 Terminal Components
- **Terminal output area**: Monospace, base64-decoded stdout/stderr streaming
- **PTY resize**: cols/rows character cell dimensions
- **Status indicators**: Process running/exited/truncated

### 6.4 Sidebar Components
- **Thread list**: Name, status badge (idle/active/systemError), model badge, timestamp
- **App list**: Logo, name, enabled toggle, install/configure button
- **Skills/plugins list**: Name, metadata, scope, enabled toggle

### 6.5 Settings Components
- **Model selector**: Dropdown with model names
- **Config layered editor**: User/project/system/MDM layers
- **Toggle controls**: Feature flags, analytics, permissions
- **Key-value editor**: Config key paths with TOML-style editing
- **Warning banner**: Config file parse errors with file path, line number, column

### 6.6 Notification Components
- **Config warning**: summary text, optional file path, text range (line/column)
- **Rate limit**: snapshot of current usage
- **Account update**: plan type / auth mode changes
- **Deprecation notice**: feature deprecation announcements
- **Guardian warning**: policy enforcement messages

### 6.7 Streaming / Progress Components
- **Agent message streaming**: Character-by-character text append
- **Tool call progress**: in-progress/completed/failed states
- **File change delta**: streaming diff chunks
- **Process output**: base64-decoded streaming bytes
- **Reasoning display**: text delta streaming with summary parts

---

## 7. Design System Summary

### Philosophy
The Codex desktop app design system is **clean, system-native, and user-respecting**:
- **Light-by-default**: Respects macOS system appearance; dark mode via `prefers-color-scheme`
- **SF Pro typography**: Uses Apple's system font for native macOS feel
- **Minimal chrome**: Thin borders, subtle separators, focus on content
- **Pill-shaped buttons**: `border-radius: 999px` for primary actions
- **Rounded cards**: 16px border-radius for containment
- **Subtle shadows**: `rgba(0,0,0,0.06)` for elevation
- **Grid layouts**: CSS grid for structured information (key-value)

### Key Design Decisions
1. **System color scheme**: Defaults to light, respects macOS dark mode — adapts to user preference
2. **SF Pro font**: Native macOS feel, consistent with system UI
3. **Pill buttons**: Modern, approachable, consistent with macOS Sonoma+ design
4. **Large border-radius**: 16px on cards, 12px on detail sections — softer, more modern
5. **Fixed wordmark header**: "ChatGPT" branding always visible at top-left
6. **CSS custom properties**: Full theming system with semantic tokens
7. **Button as border-only**: Subtle buttons that reveal on hover — clean aesthetic
8. **No heavy shadows**: Subtle shadow (0.06 opacity) — flat design with minimal elevation
9. **Minimal color palette**: Single gray scale + semantic colors — no accent color in visible CSS
10. **Monospace detail text**: For technical information (error codes, descriptions)

### Compared to Speculative Designs
The actual codebase reveals a **simpler, more native design** than previously speculated:
- No accent blue (`#0081f2`) found in the actual CSS — buttons are border-only with `currentColor`
- Light mode is the default, not dark
- SF Pro, not Inter
- No 3-column layout confirmed — protocol suggests 2 columns + optional settings/terminal panel
- No typing indicator animation confirmed in code
- No CDP browser tab confirmed in protocol
