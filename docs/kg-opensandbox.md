# OpenSandbox — Knowledge Graph

> Source: 104 docs from github.com/Pablitocalvi/OpenSandbox (Apache 2.0)

## Architecture

```
SDKs (Python, Kotlin)
    ↓
Specs (OpenAPI: execd-api.yaml, sandbox-lifecycle.yml)
    ↓
Server (FastAPI, configurable via ~/.sandbox.toml)
    ↓
Sandbox Instances (Docker containers with execd daemon inside)
```

## Sandbox Lifecycle API (sandbox-lifecycle.yml)

### Create Sandbox
```http
POST /v1/sandboxes
Authorization: OPEN-SANDBOX-API-KEY: <key>
{
  "image": {"uri": "python:3.12"},
  "timeout": 3600,
  "resourceLimits": {"cpu": "500m", "memory": "512Mi"},
  "entrypoint": ["python", "/app/main.py"],
  "env": {"KEY": "value"},
  "metadata": {"name": "user123-sandbox"}
}
```
Returns 202 Accepted with sandbox ID.

### Other Endpoints
- GET /v1/sandboxes — List (filter by state, metadata)
- GET /v1/sandboxes/{id} — Get details
- DELETE /v1/sandboxes/{id} — Terminate
- POST /v1/sandboxes/{id}/pause — Pause (preserve state)
- POST /v1/sandboxes/{id}/resume — Resume
- POST /v1/sandboxes/{id}/renew-expiration — Extend TTL
- GET /v1/sandboxes/{id}/endpoints/{port} — Get public URL

States: Pending → Running → (Pausing → Paused) → Stopping → Terminated

## Execution API (execd — Go daemon running INSIDE sandbox, port 44772)

### Run Commands
```http
POST /command
Body: {"command": "echo hello", "cwd": "/workspace", "background": false}
```
Returns SSE stream with stdout/stderr/status events.

### Code Execution (Jupyter-based)
- POST /code/context — Create session (language="python")
- POST /code — Execute code (SSE stream)
- DELETE /code?id=... — Interrupt

### File Operations
- POST /files/upload — Upload (multipart)
- GET /files/download?path=... — Download (Range headers)
- GET /files/info?path=... — Metadata
- DELETE /files?path=... — Delete
- POST /files/mv — Rename/move
- GET /files/search?path=...&pattern=** — Glob search
- POST /directories — mkdir -p
- DELETE /directories — rmdir

### Metrics
- GET /metrics — CPU/memory snapshot
- GET /metrics/watch — SSE stream

## Python SDK

```python
from opensandbox import Sandbox, ConnectionConfig

config = ConnectionConfig(domain="localhost:44772", api_key="...")

sandbox = await Sandbox.create("python:3.12", connection_config=config)
async with sandbox:
    # Run commands
    exec = await sandbox.commands.run("pip install openai-agents")
    
    # Stream output
    await sandbox.commands.run("python app.py", handlers=ExecutionHandlers(...))
    
    # File operations
    await sandbox.files.write_files([WriteEntry(path="/home/user/test.txt", data="Hello")])
    content = await sandbox.files.read_file("/home/user/test.txt")
    
    # Lifecycle
    await sandbox.renew(timedelta(hours=1))
    await sandbox.pause()
    await sandbox.resume()
    await sandbox.kill()
```

## Networking

- Bridge mode (default): Each sandbox gets execd proxy port mapped. All ports via /proxy/{port}
- Host mode: Share host network stack
- Endpoint discovery: GET /sandboxes/{id}/endpoints/{port}
- Supports HTTP, SSE, WebSocket

## Resource Limits
- cpu: "500m", "2" (millicores or whole cores)
- memory: "512Mi", "4Gi" (K8s-style)
- gpu: "1" (number of GPUs)

## Key Patterns for bapX
- Per-user sandbox: metadata={"name": username}
- SDK: Sandbox.create() on signup, sandbox.kill() on account delete
- Commands: sandbox.commands.run() for agent execution
- Files: sandbox.files for Library browser (images/, websites/, etc.)
- Endpoints: for Canvas/Browser proxy (port mapping)
- Timeout: renew daily to keep sandbox alive while user is active
