---
title: bapX Tools Manifest
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [tools, skill, manifest, provisioning]
confidence: high
---

# bapX Built-in Tools

28 tools provisioned into every sandbox at `~/.bapx/tools/`. Each is a Python CLI script called via `bapX <tool> <command> <json-args>`.

## Document & Media Tools
| Tool | Commands | Deps |
|------|----------|------|
| `pptx` | create, read, edit | python-pptx |
| `pdf` | edit, merge, split, extract | pymupdf |
| `ocr` | ocr, pdf-text, pdf-ocr, pdf-edit | pytesseract, pymupdf |
| `youtube` | transcript, info, summarize | yt-dlp, youtube-transcript-api |
| `diagram` | excalidraw, svg-arch | none |
| `ascii` | figlet, cowsay, image-to-ascii, boxes | pyfiglet |
| `p5` | sketch, shader, interactive 3D | none |
| `sketch` | html-mockup, variants | none |

## Productivity Tools
| Tool | Commands | Deps |
|------|----------|------|
| `notion` | pages, databases, search | none (API calls) |
| `linear` | issues, projects, teams | none (GraphQL) |
| `airtable` | records, filter, upsert | none (REST) |
| `email` | send, receive, search | none (IMAP/SMTP) |
| `gws` | gmail, calendar, drive, docs, sheets | google-api-client |
| `maps` | geocode, pois, routes, timezones | none (OSM API) |
| `spotify` | play, search, queue, playlists | spotipy |
| `gif` | search, download | none (Tenor API) |

## Data & Research Tools
| Tool | Commands | Deps |
|------|----------|------|
| `arxiv` | search, paper-info | arxiv |
| `rss` | monitor, fetch, search | feedparser |
| `wiki` | query, update, create | none |
| `notebook` | create, run, cells | jupyter, nbformat |

## AI / Text Tools
| Tool | Commands | Deps |
|------|----------|------|
| `humantext` | humanize, de-ai, vary | none |

## Deployment Tools (Deploy to 6 platforms)
| Tool | Commands | Deps |
|------|----------|------|
| `deploy` | vercel, github, firebase, railway, gcloud, supabase | varies by platform |

## Source
Manifest at `/root/Dev/bapx/tools/manifest.json`
Provisioning at `/root/Dev/bapx/backend.py` → `POST /api/sandbox/provision-tools`
