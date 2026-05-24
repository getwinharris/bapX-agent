# Wiki Schema & Conventions

> Last updated: 2026-05-24
> Author: bapX Research

## Overview

This research wiki contains a comprehensive UI/UX analysis of **Manus.im** (AI agent platform) and the **Codex macOS app** (OpenAI's agent runtime desktop client). The analysis covers design systems, layout architecture, component patterns, and interaction models.

## Directory Structure

```
research-wiki/
├── SCHEMA.md              # [this file] Wiki conventions and metadata
├── index.md               # Page catalog with descriptions and cross-references
├── log.md                 # Action log of research sessions
├── entities/
│   ├── manus-im.md        # Manus.im platform analysis (entity-level)
│   └── codex-macos.md     # Codex macOS app analysis (entity-level)
├── concepts/
│   ├── design-system-manus.md    # Manus design system deep dive
│   ├── design-system-codex.md    # Codex design system deep dive
│   ├── onboarding-flow.md        # Onboarding/walkthrough comparison
│   └── layout-comparison.md      # 3-column layout analysis
├── comparisons/
│   ├── manus-vs-codex-ui.md      # Side-by-side UI components comparison
│   └── manus-vs-codex-onboarding.md # Onboarding flow comparison
└── raw/                   # Source extracts and reference captures
```

## Frontmatter Convention

Every page MUST include YAML frontmatter with:

```yaml
---
title: Page Title
type: <entity|concept|comparison|reference>
status: <draft|review|final>
created: YYYY-MM-DD
updated: YYYY-MM-DD
author: bapX Research
tags: [comma-separated, keywords]
cross-refs: [other-pages-referenced]
---
```

## Markdown Conventions

| Element | Convention |
|---------|-----------|
| **Headings** | `#` title, `##` sections, `###` subsections, `####` details |
| **Code** | Inline `` ` `` for tokens/values, fenced blocks for code |
| **Tables** | Standard GFM tables with alignment |
| **Lists** | Bullet for unordered, numbered for ordered/priority |
| **Notes** | `> **Note:**` for observations |
| **Warnings** | `> **Warning:**` for caveats |
| **Cross-refs** | `→ see [entity/page-name](link)` syntax |
| **Values** | `value` format for CSS/design tokens |
| **Images** | Local under `assets/` or external URLs |

## File Naming

- Lowercase with hyphens: `design-system-manus.md`
- Entity files: single descriptive word + hyphen + entity name
- Concept files: descriptive noun phrase
- Comparison files: `a-vs-b-description.md`

## Tag Taxonomy

- `ui-analysis` — All pages involve UI/UX analysis
- `manus.im` — Manus.im specific
- `codex` — Codex macOS app specific
- `design-system` — Color, typography, spacing, components
- `layout` — Page structure and column architecture
- `onboarding` — First-run and signup experiences
- `comparison` — Side-by-side comparison pages

## Cross-Referencing Format

Use relative links without extension:
```
→ see [manus-im](../entities/manus-im)
→ see [design-system-manus](../concepts/design-system-manus)
```

## Versioning

Each page tracks:
- `created`: Initial creation date
- `updated`: Last modification date
- Semantic version via `status` field (draft → review → final)
