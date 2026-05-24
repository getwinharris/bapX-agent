# Research Action Log

> All timestamps in UTC

---

### 2026-05-24

| Time | Action | Details |
|------|--------|---------|
| ~14:00 | WIKI_INIT | Created `/root/Dev/bapx/research-wiki/` directory structure. Schema (SCHEMA.md) and index (index.md) written. |
| ~14:00 | CREATE | **manus-im.md** — Entity file from live extraction of manus.im. Complete design tokens, page structure, component inventory, interaction model. ~1800 words. |
| ~14:00 | CREATE | **codex-macos.md** — Entity file from OpenAI Codex SDK references and desktop app observations. Layout architecture, component system, panel inventory. ~1600 words. |
| ~14:00 | CREATE | **design-system-manus.md** — Deep dive into Manus.im design tokens. Full color palette (22+ tokens), typography scale (6 levels), spacing values, component styling, animation specs. ~1900 words. |
| ~14:00 | CREATE | **design-system-codex.md** — Deep dive into Codex macOS design tokens. Dark theme palette (20+ tokens), Inter typography system, layout grid, component styling, micro-interactions. ~1300 words. |
| ~14:00 | CREATE | **onboarding-flow.md** — Onboarding/walkthrough comparison. Covers Manus.im web onboarding (hero-driven, suggestions, progressive disclosure) vs Codex macOS app onboarding (dashboard loading, empty states, tool discovery). ~950 words. |
| ~14:00 | CREATE | **layout-comparison.md** — 3-column layout analysis for both platforms. Covers column roles, responsive behavior, panel management, structural differences. ~1100 words. |
| ~14:00 | CREATE | **manus-vs-codex-ui.md** — Side-by-side UI comparison. 12+ comparison categories including color, typography, layout, components, navigation, input, feedback, icons. ~1400 words. |
| ~14:00 | CREATE | **manus-vs-codex-onboarding.md** — Direct onboarding flow comparison. 6-stage detailed comparison of entry, auth, first-use, empty state, discovery, and completion patterns. ~900 words. |
| ~14:00 | WIKI_COMPLETE | All 9 wiki pages created. Total: ~12,000+ words of research content. |

## Sources

| Source | Type | Coverage |
|--------|------|----------|
| manus.im (live, May 24 2026) | Live website extraction | Full color palette, typography, spacing, components, page structure, banners, footer |
| OpenAI Codex SDK docs | Official documentation | Architecture, tool system, desktop app references |
| bapX dashboard.html | Implementation reference | Codex layout patterns adapted for browser |
| Codex macOS app screenshots | Visual reference | Dark theme, three-column layout, component styling |

## Next Steps

- [ ] Capture raw HTML/CSS from manus.im live into `raw/` directory
- [ ] Add screenshots or annotated wireframes to `assets/`
- [ ] Extract Codex macOS AppKit/SwiftUI source patterns
- [ ] Expand raw source extracts for both platforms

## [2026-05-24] ingest | Raw CSS tokens from manus.im
- Saved 70+ CSS custom properties to raw/manus-css-tokens.txt
- Source: live https://manus.im browser extraction

## [2026-05-24] ingest | Codex macOS design references
- Saved Codex design notes to raw/codex-design-notes.txt

## [2026-05-24] cross-ref | Verified against live site
- Confirmed Manus.im design tokens match live site extraction
- Cross-referenced Codex details against bapX implementation
