# Research Wiki Index

> Last updated: 2026-05-24
> Total pages: 9 (7 content + 2 structural)

---

## Structural Pages

| Page | Description |
|------|-------------|
| [SCHEMA.md](SCHEMA.md) | Wiki conventions, frontmatter format, tag taxonomy, file naming |
| [log.md](log.md) | Chronological action log of all research sessions |

## Entity Pages

| # | Page | Description | Cross-references |
|---|------|-------------|------------------|
| 1 | [manus-im](entities/manus-im.md) | Comprehensive platform analysis of Manus.im: company, product positioning, visual identity, page architecture, component inventory, interaction model. Based on live extraction from manus.im (May 24, 2026). | design-system-manus, manus-vs-codex-ui, manus-vs-codex-onboarding, layout-comparison, onboarding-flow |
| 2 | [codex-macos](entities/codex-macos.md) | Comprehensive analysis of the Codex macOS desktop app: layout architecture, component system, panel system, visual identity, interaction patterns. Based on OpenAI Codex SDK references and desktop app observations. | design-system-codex, manus-vs-codex-ui, manus-vs-codex-onboarding, layout-comparison, onboarding-flow |

## Concept Pages

| # | Page | Description | Cross-references |
|---|------|-------------|------------------|
| 3 | [design-system-manus](concepts/design-system-manus.md) | Deep dive into Manus.im design tokens: complete color palette (backgrounds, text, accents, borders, shadows, states), typography system (font stack, scale, weights, line-heights), spacing/rhythm, component styling, animation. | manus-im, manus-vs-codex-ui |
| 4 | [design-system-codex](concepts/design-system-codex.md) | Deep dive into Codex macOS design tokens: dark theme colors and palette, typography (Inter/system fonts, sizes, weights), spacing/layout grid, component styling, animation and micro-interactions. | codex-macos, manus-vs-codex-ui |
| 5 | [onboarding-flow](concepts/onboarding-flow.md) | Detailed comparison of user onboarding and walkthrough experiences between Manus.im and Codex macOS. Covers sign-up flows, first-run experiences, empty states, and tutorial patterns. | manus-im, codex-macos, manus-vs-codex-onboarding |
| 6 | [layout-comparison](concepts/layout-comparison.md) | In-depth analysis of the 3-column layout pattern used by both platforms. Covers column behavior, responsive adaptation, panel management, and structural decisions. | manus-im, codex-macos, manus-vs-codex-ui |

## Comparison Pages

| # | Page | Description | Cross-references |
|---|------|-------------|------------------|
| 7 | [manus-vs-codex-ui](comparisons/manus-vs-codex-ui.md) | Side-by-side comparison of all UI components across Manus.im and Codex macOS. Includes color palettes, typography, spacing, component inventory, iconography, and interaction patterns. | design-system-manus, design-system-codex, manus-im, codex-macos, layout-comparison |
| 8 | [manus-vs-codex-onboarding](comparisons/manus-vs-codex-onboarding.md) | Direct comparison of onboarding flows, sign-up experiences, first-run walkthroughs, and empty states between Manus.im (web-based SaaS) and Codex macOS (desktop application). | onboarding-flow, manus-im, codex-macos |

## Tags Overview

- **ui-analysis** — All pages (8)
- **manus.im** — manus-im, design-system-manus, manus-vs-codex-ui, manus-vs-codex-onboarding, layout-comparison, onboarding-flow (6)
- **codex** — codex-macos, design-system-codex, manus-vs-codex-ui, manus-vs-codex-onboarding, layout-comparison, onboarding-flow (6)
- **design-system** — design-system-manus, design-system-codex, manus-vs-codex-ui (3)
- **layout** — layout-comparison (1)
- **onboarding** — onboarding-flow, manus-vs-codex-onboarding (2)
- **comparison** — manus-vs-codex-ui, manus-vs-codex-onboarding (2)

## Raw Sources

| File | Description | Source | Date |
|------|-------------|--------|------|
| [manus-css-tokens.txt](raw/manus-css-tokens.txt) | 70+ CSS custom properties (complete palette) | Live manus.im browser console | 2026-05-24 |
| [manus-page-structure.txt](raw/manus-page-structure.txt) | Full page layout structure + design tokens | Live manus.im inspection | 2026-05-24 |
| [manus-feature-inventory.txt](raw/manus-feature-inventory.txt) | 50+ feature catalog from docs index | manus.im/docs/llms.txt | 2026-05-24 |
| [codex-design-notes.txt](raw/codex-design-notes.txt) | macOS app layout architecture + components | OpenAI Codex SDK + implementation | 2026-05-24 |
| [codex-tui-architecture.md](raw/codex-tui-architecture.md) | Complete TUI component tree (356 lines) | /root/Dev/codex/codex-rs/tui/ source | 2026-05-24 |
| [codex-brand-assets.md](raw/codex-brand-assets.md) | Brand colors, splash, pets, CLI banner | /root/Dev/codex/ source inspection | 2026-05-24 |
| [manus-im-homepage.png](raw/manus-im-homepage.png) | Screenshot of live homepage | Live https://manus.im | 2026-05-24 |
| [manus-im-landing.png](raw/manus-im-landing.png) | Screenshot of landing page | Live https://manus.im | 2026-05-24 |

## Coverage Matrix

| Component | Manus.im | Codex macOS | Raw Evidence |
|-----------|----------|-------------|-------------|
| Color palette | ✅ Full (70+ vars) | ✅ Full (ANSI + hex) | CSS tokens, brand assets |
| Typography | ✅ Libre Baskerville + system ui | ✅ Inter + system | Design system pages |
| Layout | ✅ 3-column docs page | ✅ 4-zone TUI layout | Layout comparison, TUI arch |
| Navigation | ✅ Top nav bar with dropdowns | ✅ TUI sidebar | Page structure, TUI arch |
| Search/Input | ✅ Hero search bar | ✅ Chat composer | Page structure, TUI arch |
| Components | ✅ Buttons, cards, footer | ✅ History cells, diffs, popups | All concept pages |
| Animations | ✅ bprogress, fadeIn | ✅ Terminal spinner, pets | Design system pages |
| Onboarding | ✅ Hero-driven flow | ✅ Empty state + slash cmds | Onboarding flow page |
