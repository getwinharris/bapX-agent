---
title: Manus.im Design System Deep Dive
type: concept
status: final
created: 2026-05-24
updated: 2026-05-24
author: bapX Research
tags: [ui-analysis, manus.im, design-system]
cross-refs: [manus-im, manus-vs-codex-ui]
---

# Manus.im Design System Deep Dive

> Complete design token extraction from [manus.im](https://manus.im) — May 24, 2026
> All values extracted from live website CSS and visual inspection.

---

## 1. Color Palette

### 1.1 Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| Body background | `#ffffff` | Main page background |
| Card/Section background | `#fafafa` | Feature sections, alternate backgrounds |
| Gray area | `#f8f8f7` | Muted/support sections |
| App screenshot bg (top) | `#f7f7f7` | Gradient start |
| App screenshot bg (bottom) | `#ececec` | Gradient end |
| Promotion banner start | `#EDF7FF` | Blue-tinted gradient |
| Promotion banner end | `#E9F6FD` | Blue-tinted gradient end |

### 1.2 Text Colors

| Token | Value | Weight/Usage |
|-------|-------|--------------|
| Primary text | `#34322d` | Dark brown-black — main body, headings, nav |
| Secondary text | `#5e5e5b` | Supporting text, descriptions |
| Tertiary text | `#858481` | Muted labels, captions, secondary info |
| Disabled text | `#b9b9b7` | Inactive elements, disabled states |
| Button text (black bg) | `#ffffff` | Primary CTA button text |
| Banner/gradient text | `inherit` | Uses surrounding text color |

### 1.3 Accent & Interactive Colors

| Token | Value | Usage |
|-------|-------|-------|
| Accent blue | `#0081f2` | Primary buttons, links, interactive elements, progress bar |
| Button black | `#1a1a19` | Dark buttons, CTAs, footer background |
| Error | `#f25a5a` / `#ee3a3a` | Error states, validation messages |
| Success | `#25ba3b` | Success states, confirmations |
| Selection | `#b8d3f8` | Text selection highlight |

### 1.4 Border Colors

| Token | Value | Opacity | Usage |
|-------|-------|---------|-------|
| Subtle border | `#0000000f` | 5.9% | Very subtle dividers, card borders |
| Primary border | `#4f59661f` | 12.2% | Standard separators, input borders |
| Dark border | `#0000001f` | 12.2% | Stronger borders |
| Input border active | `#0000004d` | 30.2% | Focused input state |

### 1.5 Shadow Colors

| Token | Value | Opacity | Usage |
|-------|-------|---------|-------|
| Shadow S | `#00000014` | 7.8% | Small card shadows |
| Shadow XS | `#0000000f` | 5.9% | Extra small shadows |
| Drop-1 | `#16191d08` | 3.1% | First drop shadow layer |
| Drop-2 | `#16191d0a` | 3.9% | Second drop shadow layer |
| Drop-3 | `#16191d14` | 7.8% | Third drop shadow layer |

### 1.6 Icon Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary icon | `#34322d` | Default icon color (matches primary text) |
| Tertiary icon | `#858481` | Muted icon color (matches tertiary text) |

## 2. Typography System

### 2.1 Font Stack

```
-apple-system, BlinkMacSystemFont, "Segoe UI Variable Display",
"Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif,
"Segoe UI Emoji", "Segoe UI Symbol"
```

A comprehensive Apple-first font stack that:
- Prioritizes Apple system fonts (San Francisco on macOS/iOS)
- Falls back to Segoe UI Variable Display (Windows 11+)
- Includes Segoe UI (older Windows)
- Covers Helvetica/Arial (cross-platform)
- Includes color emoji fonts for compatibility

### 2.2 Type Scale

| Level | Font | Size | Weight | Line-Height | Usage |
|-------|------|------|--------|-------------|-------|
| H1 | Libre Baskerville | 36px | 400 (regular) | 54px | Hero headline |
| H2 | Libre Baskerville | 36px | 400 (regular) | 44px | Subheadline |
| H3 / Section Header | System UI | 14px | 500 (medium) | 20px | Section labels, footer headings |
| Body | System UI | 16px | 400 (regular) | 24px | Paragraph text |
| Search/hero placeholder | System UI | 15px | 400 (regular) | — | Input placeholder |
| Buttons | System UI | 14px | 500 (medium) | 18px | Button text |

### 2.3 Margins & Spacing

| Element | Margin |
|---------|--------|
| H1 | `0 0 34px` (top 0, right 0, bottom 34px, left 0) |
| H3 | `0px` (no margin) |
| Buttons | `padding: 0px 8px` (vertical 0, horizontal 8px) |
| Input/contenteditable | `padding: 0px` |

## 3. Component Styling

### 3.1 Button System

#### Primary Button (Black)
```
background-color: #1a1a19
color: #ffffff
font-size: 14px
font-weight: 500
border-radius: 8px
padding: 0px 8px
line-height: 18px
```

#### Ghost/Secondary Button
```
background-color: transparent
color: [varies by context]
font-size: 14px
font-weight: 500
```

#### Suggestion Chip
```
background-color: [subtle background]
color: [dark text]
border-radius: [rounded]
font-size: [body or smaller]
clickable: true
```

### 3.2 Input/Form Styling

#### Search Input (Hero)
```
element: contenteditable div (not standard input)
placeholder: "Assign a task or ask anything"
font-size: 15px
font-weight: 400
padding: 0px
position: centered content area
border-radius: [rounded container, not the input itself]
```

#### Input Focus State
```
border-color: #0000004d (30.2% opacity black)
```

### 3.3 Navigation Styling

#### Top Navigation Bar
```
background-color: transparent (page bg shows through)
border-bottom: subtle (#0000000f or similar)
items: logo (left), nav links (center), auth buttons (right)
```

#### Nav Link
```
font-size: 14px
font-weight: 500
color: #34322d (primary text)
interactive: dropdown on "Resources"
```

#### Footer
```
background-color: #1a1a19
text-color: #ffffff
column layout: 7 columns
heading style: 14px/500 weight
```

### 3.4 Card Styling

#### Feature Card
```
background-color: #ffffff
border: very subtle or none
box-shadow: #00000014 (S) and/or #0000000f (XS)
border-radius: likely 8px (matching button radius)
```

#### Promotion Banner
```
background: linear-gradient(90deg, #EDF7FF, #E9F6FD)
full-width, no border
padding: [generous for content]
```

#### App Screenshot Area
```
background: linear-gradient(180deg, #f7f7f7, #ececec)
full-width
no border/shadow
```

## 4. Animation & Transitions

### 4.1 Page Progress Bar
- **Color**: `#0081f2` (accent blue)
- **Library**: bprogress
- **Behavior**: Thin horizontal bar at top of page
- **Animation**: Smooth width transition from 0% → 100%

### 4.2 Hover States
- Subtle alpha overlays
- Consistent and minimal
- No dramatic transformations

### 4.3 Dropdown Menus
- Used for "Resources" nav item
- Interactive (click/trigger to show)
- Standard reveal animation (likely fade + slide)

## 5. Design System Summary

### Philosophy
The Manus.im design system is **warm, minimal, and editorial**:
- **Warmth**: Brown-black primary text instead of pure black; cream/gray backgrounds
- **Minimalism**: Extremely subtle borders (5.9% opacity), generous whitespace, clean layouts
- **Editorial feel**: Serif Libre Baskerville for hero headings creates sophistication
- **Blue accent**: Single accent color (#0081f2) for interactivity — keeps focus simple
- **Task-first**: Hero designed completely around task input; suggestion chips lower barrier

### Key Design Decisions
1. **Serif vs Sans-serif separation**: Marketing voice (serif) vs UI function (sans-serif)
2. **Single accent color**: Blue is the only accent — reduces cognitive load
3. **Low-contrast borders**: Almost borderless design creates clean, modern feel
4. **Generous vertical rhythm**: 34px H1 margin, 54px line-height creates breathing room
5. **Dark footer as visual anchor**: Only dark element on page grounds the layout
