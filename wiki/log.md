# Wiki Log

> Chronological record of all wiki actions. Append-only.
> Format: `## [YYYY-MM-DD] action | subject`

## [2026-05-24] create | Wiki initialized
- Domain: bapX platform architecture
- Structure created with SCHEMA.md, index.md, log.md
- All entity/concept/comparison categories created

## [2026-05-24] ingest | Hermes Agent Blueprint
- Created [[hermes-agent-blueprint]] — full reference architecture
- Created [[codex-fork-native-capabilities]] — Codex vs needs
- Created [[sandbox-isolation-architecture]] — per-user containers
- Created [[bapx-tools-manifest]] — 28 tools
- Created [[provider-auth-system]] — 30 providers
- Created [[frontend-architecture]] — 3-column SPA

## [2026-05-24] create | VPS Knowledge Graph
- Created [[vps-knowledge-graph]] — full system map
  - Physical topology, port map, 8 request flows, dependency graph
  - Tool call chains, data flow diagram, file registry, auth map, 24 API deps

## [2026-05-24] ingest | Cross-Session Memory Systems (4 sources)
- Created [[codex-memory-system]] — Codex SQLite implementation (memories table, LLM recall, FTS5)
- Created [[hermes-memory-system]] — Hermes USER.md/MEMORY.md two-store reference
- Created [[agents-sdk-context-memory]] — OpenAI Agents SDK RunContext (no persistence)
- Created [[opensandbox-memory-persistence]] — Docker container lifecycle, filesystem isolation
