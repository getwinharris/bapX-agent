---
title: OpenSandbox Memory & Persistence
created: 2026-05-24
updated: 2026-05-24
type: entity
tags: [opensandbox, sandbox, persistence, isolation, docker]
confidence: high
---

# OpenSandbox Memory & Persistence

## How Sandbox Persistence Works

### Container Lifecycle
- Each user gets a Docker container via OpenSandbox
- Containers persist between sessions (not ephemeral)
- Container ID is stored in SQLite (`users.sandbox_id`)
- When user logs in, we check if container is running
- If stopped, we reconnect/recreate

### Filesystem Persistence
Inside each container, the filesystem persists:
```
/root/
  .bapx/
    config.toml      — API keys
    auth.json        — OAuth tokens
    tools/           — 28 tool scripts
    skills/          — installed skills
    memories/USER.md — user profile
    memories/MEMORY.md — persistent facts
  projects/          — user project files
```

The Docker container's filesystem is NOT ephemeral — data survives container restarts.
Only `docker kill` + `docker rm` destroys data (on billing prune).

### Memory Isolation
- **No cross-user memory** — each sandbox has its own filesystem
- **No host filesystem access** — sandbox can't read `/root/Dev/bapx/` or `~/.hermes/`
- **Credentials never leave** — API keys stay in sandbox `~/.bapx/`
- **Device ID** — each sandbox gets a unique container ID (acts as device fingerprint)

### Data Flow
```
User creates memory → ~/.bapx/memories/MEMORY.md
  → Agent reads it next session
  → Stored until sandbox is pruned (14 days after billing failure)
```

### Provisioning
On sandbox create:
1. Copy tool scripts → `~/.bapx/tools/`
2. Install Python deps → `pip3 install`
3. Install system deps → `apt-get install`
4. Install bapX runtime → `/usr/local/bin/bapX`
5. Create memories directory → `mkdir -p ~/.bapx/memories/`

## See Also
- [[sandbox-isolation-architecture]] — full isolation model
- [[hermes-memory-system]] — reference memory design
- [[codex-memory-system]] — Codex SQLite implementation
