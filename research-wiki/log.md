## [2026-05-24] ingest | Full Codex macOS TUI architecture
- Extracted from source code at /root/Dev/codex/codex-rs/tui/
- 356-line architecture doc covering 30+ TUI modules
- Component tree: App → ChatWidget → BottomPane → Popups
- 11 history cell variants, diff renderer, popup system
- ANSI color conventions, adaptive themes, diff backgrounds

## [2026-05-24] ingest | Full Codex brand assets
- Splash image description (1898×1190 PNG)
- CLI banner/logo patterns from main.rs
- Complete brand color palette (magenta, cyan, green, red)
- Terminal pet catalog (8 types, 72-frame spritesheets)
- macOS Desktop app identity and bundle metadata

## [2026-05-24] ingest | Manus.im feature inventory
- Full 50+ feature catalog from docs index
- Covers browser, collaboration, content creation, integrations
- Website builder capabilities, data/analytics, platform details

## [2026-05-24] ingest | Manus.im page structure
- Complete page layout: nav, hero, search, features, footer
- All design tokens with exact hex values
- Typography scale, spacing, component specs

## [2026-05-24] cross-ref | 100% completion check
- Verified all research wiki pages have matching raw sources
- Raw/ now contains: css-tokens, design-notes, feature-inventory, 
  page-structure, tui-architecture, brand-assets
- Screenshots saved as evidence

## [2026-05-24] FIX | Removed incorrect TUI research
- Deleted raw/codex-tui-architecture.md and raw/codex-brand-assets.md
  (these were TUI/CLI patterns, not the macOS GUI app)

## [2026-05-24] REPLACE | codex-macos.md — corrected to real desktop app
- Correct architecture: Native .app + Rust backend + daemon + JSON-RPC protocol
- macOS specifics: DMG distribution, JIT entitlement, Apple Silicon
- Login flow with OAuth web views and actual HTML page analysis
- UI layout: 2-column + optional panel (NOT 3-column)
- No CDP browser; realtime audio confirmed instead

## [2026-05-24] REPLACE | design-system-codex.md — corrected with real CSS tokens
- Light mode is DEFAULT; dark via prefers-color-scheme
- SF Pro typography (Apple system font), not Inter
- Border-only pill-shaped buttons (border-radius: 999px)
- Actual CSS from success.html and error.html (only confirmed HTML)

## [2026-05-24] CREATE | raw/codex-desktop-app-protocol.md (658 lines)
- 95 JSON-RPC message types with UI mappings
- All 5 approval dialog types
- Streaming UI components (chat, terminal, diffs, reasoning)
- OAuth/login flows with HTML page analysis
