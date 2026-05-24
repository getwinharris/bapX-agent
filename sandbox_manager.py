"""
bapX Sandbox Manager — per-user sandbox lifecycle via OpenSandbox.

Manages isolated environments for code execution and autonomous tasks.
"""
import json, uuid, asyncio
from datetime import datetime, timezone
from typing import Optional

import httpx

# ── OpenSandbox Server ──
OPEN_SANDBOX_URL = "http://127.0.0.1:8080"
SANDBOX_TIMEOUT = 3600  # 1 hour default
EXECD_PORT = 8765  # execd runs inside sandbox on this port

# In-memory tracker: user_id -> sandbox_info dict
# In Phase 2+ this moves to the DB
_sandbox_registry: dict[str, dict] = {}


async def start_sandbox(user_id: str, username: str) -> dict:
    """Create a sandbox for the user via OpenSandbox API."""
    # Check if already exists
    existing = _sandbox_registry.get(user_id)
    if existing:
        # Verify it's still alive
        try:
            info = await get_sandbox_status(user_id)
            if info.get("status") and info["status"].get("phase", "").lower() in ("running", "active"):
                return info
        except Exception:
            pass
        # Stale entry — remove it
        _sandbox_registry.pop(user_id, None)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{OPEN_SANDBOX_URL}/v1/sandboxes",
                json={
                    "image": {"uri": "python:3.11-slim"},
                    "entrypoint": ["/bin/sh", "-c", "sleep infinity"],
                    "timeout": SANDBOX_TIMEOUT,
                    "resourceLimits": {"cpu": "0.5", "memory": "512Mi"},
                    "metadata": {
                        "name": username,
                        "user_id": user_id,
                    },
                },
            )
            if resp.status_code >= 400:
                return {"error": f"OpenSandbox error: {resp.status_code} {resp.text[:200]}"}

            data = resp.json()
            sandbox_id = data.get("id", "")
            if not sandbox_id:
                return {"error": "No sandbox ID returned"}

            _sandbox_registry[user_id] = {
                "sandbox_id": sandbox_id,
                "user_id": user_id,
                "username": username,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "provider": "opensandbox",
            }

            return {
                "sandbox_id": sandbox_id,
                "status": data.get("status", {}),
                "metadata": data.get("metadata", {}),
            }
    except httpx.RequestError as e:
        return {"error": f"Sandbox connection failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Sandbox creation failed: {str(e)}"}


async def stop_sandbox(user_id: str) -> dict:
    """Delete a user's sandbox."""
    info = _sandbox_registry.get(user_id)
    if not info:
        return {"error": "No sandbox found for this user"}

    sandbox_id = info.get("sandbox_id", "")
    if not sandbox_id:
        _sandbox_registry.pop(user_id, None)
        return {"error": "Invalid sandbox state"}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.delete(f"{OPEN_SANDBOX_URL}/v1/sandboxes/{sandbox_id}")
            _sandbox_registry.pop(user_id, None)
            if resp.status_code >= 400:
                return {"warning": f"Delete returned {resp.status_code}", "deleted": True}
            return {"status": "deleted", "sandbox_id": sandbox_id}
    except Exception as e:
        # Remove from registry even if API call fails
        _sandbox_registry.pop(user_id, None)
        return {"warning": f"Cleanup error: {str(e)}", "deleted": True}


async def get_sandbox_status(user_id: str) -> dict:
    """Get sandbox status for a user."""
    info = _sandbox_registry.get(user_id)
    if not info:
        return {"status": "none", "sandbox_id": None}

    sandbox_id = info.get("sandbox_id", "")
    if not sandbox_id:
        _sandbox_registry.pop(user_id, None)
        return {"status": "none", "sandbox_id": None}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{OPEN_SANDBOX_URL}/v1/sandboxes/{sandbox_id}")
            if resp.status_code == 404:
                _sandbox_registry.pop(user_id, None)
                return {"status": "not_found", "sandbox_id": sandbox_id}
            if resp.status_code >= 400:
                return {"status": "error", "detail": resp.text[:200]}

            data = resp.json()
            return {
                "status": data.get("status", {}).get("phase", "unknown"),
                "sandbox_id": sandbox_id,
                "info": data,
            }
    except httpx.RequestError as e:
        return {"status": "unknown", "error": str(e), "sandbox_id": sandbox_id}


async def exec_in_sandbox(user_id: str, command: str, language: str = "bash") -> dict:
    """Execute a command inside the user's sandbox via proxy/execd."""
    info = _sandbox_registry.get(user_id)
    if not info:
        return {"error": "No active sandbox. Start one first."}

    sandbox_id = info.get("sandbox_id", "")
    if not sandbox_id:
        return {"error": "Invalid sandbox state"}

    # Try to execute via execd proxy
    # execd runs inside sandbox on port EXECD_PORT
    # POST /v1/sandboxes/{id}/proxy/{port}/api/execute
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            exec_url = f"{OPEN_SANDBOX_URL}/v1/sandboxes/{sandbox_id}/proxy/{EXECD_PORT}/api/execute"
            resp = await client.post(
                exec_url,
                json={"command": command, "language": language},
                timeout=60,
            )
            if resp.status_code < 500:
                return resp.json()
            # If execd isn't running, try raw shell via proxy
            shell_url = f"{OPEN_SANDBOX_URL}/v1/sandboxes/{sandbox_id}/proxy/22/exec"
            return {"output": f"execd not ready on port {EXECD_PORT}: {resp.status_code}"}
    except httpx.RequestError:
        return await _exec_local_fallback(user_id, command, language)
    except Exception as e:
        return {"error": f"Execution error: {str(e)}"}


async def _exec_local_fallback(user_id: str, command: str, language: str) -> dict:
    """Fallback: execute in local subprocess for Phase 1.
    Returns output as if it came from the sandbox.
    """
    import subprocess
    safe_cmd = command[:2000]
    try:
        if language == "python":
            proc = await asyncio.create_subprocess_exec(
                "python3", "-c", safe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        else:
            proc = await asyncio.create_subprocess_shell(
                safe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        except asyncio.TimeoutError:
            proc.kill()
            return {"output": "Execution timed out after 30 seconds.", "exit_code": -1}

        output = (stdout.decode() + stderr.decode())[:10000]
        return {
            "output": output,
            "exit_code": proc.returncode,
            "mode": "local_fallback",
        }
    except Exception as e:
        return {"error": f"Execution error: {str(e)}"}


async def list_user_sandboxes(user_id: str) -> list[dict]:
    """List all sandboxes for this user via OpenSandbox API."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{OPEN_SANDBOX_URL}/v1/sandboxes",
                params={"metadata.user_id": user_id},
            )
            if resp.status_code >= 400:
                return []
            data = resp.json()
            items = data.get("items", []) if isinstance(data, dict) else []
            return items
    except Exception:
        return []


def clear_sandbox_registry(user_id: str) -> None:
    """Remove a user from the sandbox registry."""
    _sandbox_registry.pop(user_id, None)
