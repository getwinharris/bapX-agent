---
title: Manus.im vs Codex macOS — UI Comparison
type: comparison
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, manus.im, codex, comparison, design-system]
cross-refs: [manus-im, codex-macos, design-system-manus, design-system-codex, layout-comparison]
---

# Manus.im vs Codex macOS — Side-by-Side UI Comparison

> Direct comparison of all major UI design dimensions between Manus.im (web SaaS) and Codex macOS (desktop app).
> Live extraction from manus.im (May 24, 2026) and Codex SDK/desktop references.

---

## 1. Design Philosophy

| Dimension | Manus.im | Codex macOS |
|-----------|----------|-------------|
| **Mood** | Warm, editorial, professional | Dark, functional, developer-focused |
| **Theme** | Light (white/gray) | Dark (charcoal/black) |
| **Visual weight** | Minimal, almost borderless | Structured with clear containers |
| **Typography mood** | Serif + system = refined | Sans-serif system = utilitarian |
| **Target user** | Business professionals | Developers |
| **Platform feel** | SaaS web app | Native desktop tool |

## 2. Color Comparison

| Token | Manus.im | Codex macOS |
|-------|----------|-------------|
| **Background** | `#ffffff` white | `#1a1a1a` dark |
| **Section bg** | `#fafafa` light gray | `#212125` dark gray |
| **Card bg** | `#ffffff` | `#2a2a2e` |
| **Primary text** | `#34322d` brown-black | `#e8e8f0` off-white |
| **Secondary text** | `#5e5e5b` gray | `#a0a0b0` medium gray |
| **Tertiary text** | `#858481` muted | `#6c6c7a` muted |
| **Accent blue** | `#0081f2` | `#0081f2` |
| **Button/Call to action** | `#1a1a19` black | `#0081f2` accent blue |
| **Error** | `#f25a5a` / `#ee3a3a` | `#f25a5a` |
| **Success** | `#25ba3b` | `#25ba3b` |
| **Disabled text** | `#b9b9b7` | `#4a4a55` |
| **Subtle border** | `#0000000f` (6% opacity) | `rgba(255,255,255,0.06)` |
| **Standard border** | `#4f59661f` (12% opacity) | `rgba(255,255,255,0.1)` |
| **Input focus** | `#0000004d` (30% opacity) | `#0081f2` or blue-tinted |

> **Note**: Both use `#0081f2` as accent blue — identical hex value.
> Both use `#f25a5a` for error and `#25ba3b` for success — identical values.

## 3. Typography Comparison

| Level | Manus.im | Codex macOS |
|-------|----------|-------------|
| **Font stack** | Apple system stack | Inter, system fallback |
| **Hero/H1** | Libre Baskerville, 36px, 400, 54px lh | N/A (no marketing hero) |
| **H2** | Libre Baskerville, 36px, 400, 44px lh | N/A |
| **Primary body** | System UI, 16px, 400, 24px lh | Inter, 15-16px, 400, 22-24px lh |
| **Section header** | System UI, 14px, 500, 20px lh | Inter, 13px, 500, 16px lh |
| **Button text** | System UI, 14px, 500 | Inter, 13-14px, 500 |
| **Input text** | System UI, 15px, 400 | Inter, 15px, 400 |
| **Monospace** | Not used (marketing site) | SF Mono / JetBrains Mono, 13-14px |

## 4. Spacing & Layout Comparison

| Dimension | Manus.im | Codex macOS |
|-----------|----------|-------------|
| **Layout structure** | Marketing pages + app area | Three-column app layout |
| **Sidebar pattern** | 48px icon rail + expandable | 48px icon rail + expandable |
| **Right panel** | 320-400px, toggleable | 320-400px, toggleable |
| **Border radius** | 8px (buttons) | 8-12px (bubbles, inputs) |
| **Base spacing** | Variable (content-driven) | 4px grid system |
| **Content max-width** | Constrained (marketing) | Flexible (fills window) |

## 5. Component Inventory Comparison

### 5.1 Buttons

| Variant | Manus.im | Codex macOS |
|---------|----------|-------------|
| **Primary** | `#1a1a19` black bg, white text | `#0081f2` blue bg, white text |
| **Secondary/Ghost** | Transparent, text-only | Transparent, text-only |
| **Radius** | 8px | 8-12px |
| **Weight** | 500 | 500 |
| **Size** | 14px | 13-14px |

### 5.2 Input Fields

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **Element** | contenteditable div | Standard input/textarea |
| **Placeholder** | "Assign a task or ask anything" | "Ask anything..." |
| **Style** | Minimal, almost borderless | Dark bg, visible border |
| **Focus** | `#0000004d` border | Blue accent border |

### 5.3 Navigation

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **Primary** | Horizontal top nav (logo + links + auth) | Vertical left sidebar (icons) |
| **Secondary** | Footer with 7 columns | Bottom section in sidebar |
| **Auth** | "Sign in" / "Sign up" in nav | API key setup in settings |
| **Dropdown** | "Resources" has dropdown | N/A (all items visible) |

### 5.4 Chat/Messaging

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **User messages** | Not applicable (marketing site) | Right-aligned, accent bg bubble |
| **Assistant messages** | Not applicable (marketing site) | Left-aligned, dark bg bubble |
| **Code blocks** | Not displayed | Monospace, dark, syntax highlighted |
| **Tool calls** | Not displayed | Collapsible cards with status |
| **Typing indicator** | Not applicable | Bouncing dots animation |

### 5.5 Feedback & Loading

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **Page loading** | bprogress bar (#0081f2) | N/A (native app) |
| **Typing indicator** | N/A | 3 bouncing dots |
| **Error states** | Red (#f25a5a) | Red (#f25a5a) |
| **Success states** | Green (#25ba3b) | Green (#25ba3b) |
| **Skeleton** | Not observed | Gray shimmer (initial load) |

### 5.6 Iconography

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **Icons** | SVG-based | AppKit native icons or custom SVGs |
| **Icon colors** | `#34322d` (primary), `#858481` (tertiary) | `#a0a0b0` (default), `#e8e8f0` (active) |
| **Size** | Scales with text | 24x24px (sidebar) |
| **Logo** | SVG in nav | OpenAI "o" mark or Codex icon |

## 6. Visual Element Comparison

| Element | Manus.im | Codex macOS |
|---------|----------|-------------|
| **Banner** | Gradient promotion, Meta announcement | None |
| **Footer** | Dark (#1a1a19), 7 columns, white text | None (desktop app) |
| **Hero section** | Serif headline + search + suggestions | None |
| **App demo** | Full-width app screenshot gradient | Live app itself |
| **Shadow system** | Multi-layer (#16191d08/0a/14) | Standard drop shadows |

## 7. Interaction Model Comparison

| Aspect | Manus.im | Codex macOS |
|--------|----------|-------------|
| **Primary input** | Task/search box at top | Chat input at bottom |
| **Navigation method** | Top nav bar | Left sidebar |
| **Discovery** | Scroll marketing content, suggestion chips | Welcome message, suggested prompts |
| **Auth trigger** | Before app access | Before API usage (key setup) |
| **Panel management** | App-level toggle | Toggle + tab system |
| **Search** | Built-in task input | Not a search-first interface |

## 8. Summary of Shared Elements

Despite different platforms and audiences, both share:

1. **`#0081f2` accent blue** — identical interactive color
2. **`#f25a5a` error red** — identical
3. **`#25ba3b` success green** — identical
4. **48px sidebar icon rail** — collapsed/expandable pattern
5. **320-400px right panel** — three-tab context panel
6. **8-12px border radius** — rounded UI elements
7. **Task-driven interaction** — both center on task assignment/execution
8. **14px/500 font weight** — for buttons and labels
9. **Progressive disclosure** — reveal complexity gradually
10. **Minimal chrome** — focus on content, not UI framing

## 9. Key Differences Summary

| Dimension | Manus.im | Codex macOS |
|-----------|----------|-------------|
| **Theme** | Light | Dark |
| **Marketing** | Full marketing site | None (direct app) |
| **Typography** | Serif + system | Inter only |
| **Entry point** | Hero search | Chat input |
| **Auth model** | Sign-up wall | API key setup |
| **Platform** | Web | Native macOS |
| **Mobile** | Responsive | N/A |
