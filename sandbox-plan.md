# bapx.in Sandbox Architecture — Research Plan

## Environment Inventory

| Resource | Value |
|---|---|
| CPU | 2 cores |
| RAM | 7.7 GiB (~4.3 GiB available after current usage) |
| Disk | 96 GB (77 GB available) |
| Docker | 29.1.3 (overlayfs, cgroup v2, systemd cgroup driver) |
| Containers Running | 1 (bapx-postgres) |
| Hermes Agent | Installed at `/usr/local/lib/hermes-agent` (Dockerfile + docker-compose exist) |
| Hermes Docker Image | **Not built yet** — no `hermes-agent` tag in local registry |
| Base Image Used by Hermes | `debian:13.4` with Python 3.13, uv, npm, Playwright, tini |
| Hermes Config | `~/.hermes/config.yaml` (model: deepseek-v4-flash, provider: custom) |
| bapx.in Code | FastAPI auth API (`main.py`) + React SPA frontend (`app/`) already scaffolded |

## Resource Math

**Conservative sandbox allocation per Hermes Agent instance:**

- Reserve: ~2.0 GiB OS + services + bapx API + DB
- Each Hermes sandbox container: ~1.0–1.5 GiB (includes OS + Python deps + Playwright)
- **Available:** ~4.3 GiB
- **Max concurrent Hermes sandboxes on this host:** **2–3 comfortably, maybe 4 at peak**

Pushing beyond this requires:
- Lighter Hermes image (slim variant without Playwright/frontend build)
- Swap (currently 0 — adding 2–4 GiB would help with burst)
- Moving to Kubernetes with multiple nodes

If the goal is 10+ concurrent users, a single Docker host won't work — you need Kubernetes.

## What OpenSandbox Offers

**OpenSandbox** (Alibaba, Apache 2.0, CNCF landscape) is a complete sandbox platform for AI agents:

### Key Capabilities
1. **Lifecycle API** (FastAPI control plane): `POST /v1/sandboxes` → create/start → pause/resume → delete. Async with state machine.
2. **Docker Runtime** — creates containers from any OCI image, injects `execd` (Go daemon) for command execution + file operations + code interpreter.
3. **Multi-language SDKs** — Python, JS/TS, Java, C#, Go SDKs wrapping the lifecycle + execution APIs.
4. **Egress Policy** — sidecar container for DNS/nftables-based network policy per sandbox.
5. **Ingress Gateway** — HTTP/WebSocket reverse proxy for routing to sandbox service ports.
6. **Pause/Resume/Snapshots** — Docker mode: pause container, commit to image, restore.
7. **Resource Limits** — per-sandbox CPU/memory/GPU via Kubernetes-style specs.
8. **Secure Runtimes** — gVisor, Kata, Firecracker microVM support (optional).

### Lifecycle API (REST, base `/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/sandboxes` | Create sandbox from image or snapshot |
| GET | `/sandboxes` | List sandboxes (filter by state, metadata) |
| GET | `/sandboxes/{id}` | Get sandbox status |
| DELETE | `/sandboxes/{id}` | Kill sandbox |
| POST | `/{id}/pause` | Pause (Docker: container pause) |
| POST | `/{id}/resume` | Resume |
| POST | `/{id}/renew-expiration` | Extend TTL |
| GET | `/{id}/endpoints/{port}` | Resolve service endpoint |
| POST | `/snapshots` | Snapshot a sandbox |

### Why OpenSandbox Fits bapx.in
- **Already has Docker** — OpenSandbox's Docker runtime works out of the box
- **execd** gives command execution + file ops without SSH or custom agents
- **Network isolation** via egress sidecar is built-in (prevent sandbox-to-sandbox leakage)
- **MCP server** available — Claude Code, Cursor, and other AIs can connect natively
- **Python/JS SDKs** — both align with the existing bapx stack (FastAPI backend + React frontend)

### OpenSandbox Downsides
- **Heavy stack** — creates 3 containers per sandbox (main + execd init + egress sidecar) in full config
- **execd image** (`opensandbox/execd:v1.0.17`) is ~20+ MB Go binary — a dependency to pull
- **Configuration** needs TOML file setup, PostgreSQL/SQLite for metadata
- **More complex than needed** if bapx only needs "run Hermes isolated per user"

## Hermes Agent Docker Analysis

The existing `Dockerfile` at `/usr/local/lib/hermes-agent/Dockerfile`:
- Base: `debian:13.4` (Debian Trixie)
- Python 3.13 via uv
- Includes Playwright (Chromium), Node.js, npm, ripgrep, ffmpeg, git, SSH, Docker CLI
- **Must run with `--network host`** or bridge with port mapping
- Uses `tini` as PID 1 (zombie reaper)
- Default entrypoint: gateway run
- Volume: `/opt/data` for hermes home

**Key insight:** The Hermes Dockerfile already includes `docker-cli`. This means a Hermes container could manage Docker from inside — useful for a "nested sandbox" pattern where Hermes itself orchestrates sub-containers.

## Recommended Approach

### Option A (Recommended for MVP): Plain Docker API per User
**Lightest-weight, direct control.**

- bapx API calls Docker SDK directly (via `docker-py` or subprocess)
- Each user gets a `docker run` of the hermes-agent image with:
  ```bash
  docker run -d \
    --name hermes-{user_id} \
    --network host \
    -v /root/.hermes/users/{user_id}:/opt/data \
    hermes-agent gateway run
  ```
- bapx tracks container ↔ user mapping in PostgreSQL
- TTL via `docker stop -t {timeout}` or `docker rm -f`
- Resource limits: `--cpus 0.5 --memory 512m` per container
- **Pros:** Simple, no new infra, direct control, lightweight
- **Cons:** No pause/resume/snapshot, no built-in execd (Hermes handles its own commands), manual network isolation needed

### Option B: OpenSandbox + Hermes as Sandbox Image
**Full-featured but heavier.**

- Run OpenSandbox lifecycle server as a sidecar service
- OpenSandbox manages container lifecycle
- Hermes Agent image IS the sandbox image users are created from
- bapx calls OpenSandbox API → OpenSandbox creates Docker container running Hermes
- execd is injected but redundant since Hermes has its own tool execution
- **Pros:** Pause/resume/snapshot, network isolation, ingress gateway, SDKs available
- **Cons:** Complexity overhead, execd is redundant, 3x containers per sandbox, more Docker resource pressure

### Option C: Hybrid — bapx Orchestrates Docker + Hermes execd
**Best of both worlds for production.**

- bapx API manages containers directly via Docker (like Option A)
- Adds a lightweight orchestration layer: tracks state, enforces TTL, isolates networks
- Optionally use OpenSandbox's `execd` as an injected sidecar for file/command access if needed
- Could later migrate to OpenSandbox or Kubernetes without changing the API surface
- **Pros:** MVP-fast, migration path to OpenSandbox/K8s later, full control
- **Cons:** Custom orchestration code needed, reinventing parts of OpenSandbox

**Recommendation for MVP: Option A (Plain Docker).**
OpenSandbox is the right choice when you need multi-tenant Docker orchestration at scale, custom sandbox images, per-sandbox network policies, or Kubernetes. For bapx MVP with 2 CPUs and <5 concurrent users, plain Docker is faster to build and leaner.

## High-Level Architecture (Option A — Recommended MVP)

```
                         ┌─────────────────────────────┐
                         │       bapx.in Host           │
                         │   (2 CPU, 7.7 GB RAM)        │
                         │                              │
  User ──HTTPS──►  bapx API (FastAPI :8080)            │
                     │                                  │
                     │  POST /api/sandbox/create         │
                     │  POST /api/sandbox/{id}/kill      │
                     │  GET  /api/sandbox/{id}/status    │
                     ▼                                  │
               ┌──────────────┐                         │
               │ Sandbox       │                         │
               │ Orchestrator  │                         │
               │ (in bapx API) │                         │
               └──────┬───────┘                         │
                      │ Docker API calls                 │
                      ▼                                  │
              ┌──────────────────┐                       │
              │  Docker Engine    │                       │
              │  (overlayfs)      │                       │
              └───┬────┬────┬────┘                       │
                  │    │    │                            │
         ┌────────┘    │    └────────┐                   │
         ▼             ▼             ▼                   │
   ┌──────────┐ ┌──────────┐ ┌──────────┐               │
   │ Hermes-1 │ │ Hermes-2 │ │ Hermes-3 │               │
   │ (user A) │ │ (user B) │ │ (user C) │               │
   │ :5001    │ │ :5002    │ │ :5003    │               │
   │ 0.5 CPU  │ │ 0.5 CPU  │ │ 0.5 CPU  │               │
   │ 512M RAM │ │ 512M RAM │ │ 512M RAM │               │
   └──────────┘ └──────────┘ └──────────┘               │
                         │                              │
              ┌──────────┴──────────┐                    │
              │   PostgreSQL :5432   │                    │
              │   (bapx DB)         │                    │
              └─────────────────────┘                    │
```

### Minimum Viable Deployment

1. **Build the Hermes Docker image** (`docker build -t hermes-agent .` in `/usr/local/lib/hermes-agent/`)
2. **Extend bapx API** with sandbox endpoints:
   - `POST /api/sandbox` — creates a named Hermes container, returns connection info
   - `DELETE /api/sandbox/{id}` — stops/removes the container
   - `GET /api/sandbox/{id}` — returns status + logs URL
3. **Port mapping strategy:**
   - Each Hermes gateway listens on a unique port (e.g., 5001, 5002, ...)
   - Or use subdomain routing + reverse proxy (Nginx/Caddy)
4. **Resource caps per container:**
   ```bash
   --cpus 0.5 --memory 512m --memory-reservation 384m
   ```
5. **TTL enforcement:** bapx cron job checks `docker ps` for expired sandboxes, auto-kills

### Scaling Beyond This Host

| Stage | Setup | Max Concurrent |
|---|---|---|
| MVP | 1 host, plain Docker | 2–3 users |
| Growth | Add swap, slim Hermes image | 4–5 users |
| Prod | Kubernetes cluster (3+ nodes) | 50+ users |
| Scale | OpenSandbox on Kubernetes | 100+ users |

## Next Steps

1. ✅ OpenSandbox researched (this doc)
2. ❌ Build Hermes Docker image
3. ❌ Design bapx sandbox orchestration endpoints
4. ❌ Wire up per-user config directories
5. ❌ Implement TTL + cleanup cron
6. ❌ Add resource monitoring (disk/RAM per container)
