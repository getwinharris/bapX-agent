# Wiki Schema

## Domain
bapX platform — browser-based AI agent platform built on forked Codex runtime.
Architecture: Python FastAPI backend, pure HTML/CSS/JS frontend, per-user Docker
sandboxes via OpenSandbox. The agent runtime is a Codex fork (Rust) that runs
inside each sandbox. Auth credentials and tools live in the sandbox. The host VPS
runs the backend, Caddy, SearXNG, and KittenTTS.

## Conventions
- File names: kebab-case, no spaces (e.g., `codex-fork-architecture.md`)
- Every wiki page starts with YAML frontmatter
- Use `[[wikilinks]]` to link between pages (minimum 2 outbound links per page)
- When updating a page, always bump the `updated` date
- Every new page must be added to `index.md` under the correct section
- Every action must be appended to `log.md`
- Provenance markers on pages synthesizing 3+ sources

## Frontmatter
```yaml
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: entity | concept | comparison | query | summary
tags: [from taxonomy below]
sources: [raw/articles/source-name.md]
confidence: high | medium | low
---
```

## Tag Taxonomy
- Architecture: architecture, design, pattern, stack, data-flow
- Deployment: deploy, hosting, domain, ssl, caddy
- Sandbox: sandbox, docker, opensandbox, isolation, container
- Auth: auth, oauth, api-key, provider, credential
- Tools: tool, skill, plugin, mcp
- Browser: browser, cdp, playwright, annotation, preview
- Memory: memory, session, persistence, recall
- Cron: cron, scheduler, periodic, job
- Frontend: frontend, ui, mobile, responsive, dashboard
- Backend: backend, api, fastapi, database, sqlite
- Codex: codex, rust, tui, runtime, fork
- Hermes: hermes, blueprint, reference
- Infrastructure: infra, vps, monitoring, health

## Page Thresholds
- Create a page when an entity/concept appears in 2+ sources
- Add to existing page when a source mentions something already covered
- DON'T create a page for passing mentions
- Split a page when it exceeds ~200 lines

## Update Policy
When new information conflicts with existing content:
1. Check the dates — newer sources generally supersede older ones
2. If genuinely contradictory, note both positions with dates and sources
3. Mark the contradiction in frontmatter
