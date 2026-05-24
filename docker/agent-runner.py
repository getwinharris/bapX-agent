"""bapX Agent — OpenAI Agents SDK inside OpenSandbox sandbox.

Listens on port 8765 for SSE chat bridge.
Uses user's SOUL.md as agent instructions.
Has web search, browser, code tools + filesystem access.
Memory persists in /home/user/.memory/
Skills in /home/user/skills/
"""

import os, json, uuid, asyncio
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agents import Agent, Runner, WebSearchTool, ComputerTool, function_tool
from agents import set_default_openai_key, set_default_openai_base_url

app = FastAPI(title="bapX Agent")
_INTERNAL_KEY = os.environ.get("BAPX_INTERNAL_API_KEY", "")
USER_HOME = Path("/home/user")

# ── Auth ──
async def verify_auth(request: Request):
    auth = request.headers.get("Authorization", "")
    expected = f"Bearer {_INTERNAL_KEY}"
    if _INTERNAL_KEY and auth != expected:
        raise HTTPException(401, "Unauthorized")

# ── Function Tools ──
@function_tool
def read_file(path: str) -> str:
    """Read a file from the sandbox filesystem."""
    full = USER_HOME / path.lstrip('/')
    if not full.exists() or not str(full).startswith(str(USER_HOME)):
        return f"Error: File not found or access denied: {path}"
    try:
        return full.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        return f"Error reading file: {e}"

@function_tool
def write_file(path: str, content: str) -> str:
    """Write content to a file in the sandbox filesystem."""
    full = USER_HOME / path.lstrip('/')
    if not str(full).startswith(str(USER_HOME)):
        return "Error: Access denied"
    try:
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding='utf-8')
        return f"Written to {path}"
    except Exception as e:
        return f"Error writing file: {e}"

@function_tool
def list_files(path: str = "") -> str:
    """List files in a directory in the sandbox."""
    base = USER_HOME / path.lstrip('/') if path else USER_HOME
    if not str(base).startswith(str(USER_HOME)):
        return "Error: Access denied"
    if not base.exists():
        return f"Directory not found: {path or '/'}"
    try:
        items = []
        for f in base.iterdir():
            size = f.stat().st_size if f.is_file() else 0
            items.append(f"{'📁' if f.is_dir() else '📄'} {f.name} ({size} bytes)" if f.is_file() else f"{'📁' if f.is_dir() else '📄'} {f.name}")
        return "\n".join(items) if items else "(empty)"
    except Exception as e:
        return f"Error: {e}"

@function_tool
def run_python(code: str) -> str:
    """Execute Python code and return the output."""
    import subprocess, tempfile
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, dir='/tmp') as f:
            f.write(code)
            f.flush()
            result = subprocess.run(['python3', f.name], capture_output=True, text=True, timeout=30, cwd=str(USER_HOME))
            out = result.stdout
            if result.stderr:
                out += f"\n[stderr]\n{result.stderr[:2000]}"
            os.unlink(f.name)
            return out or "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: Execution timed out (>30s)"
    except Exception as e:
        return f"Error: {e}"

# ── Agent Setup ──
agent_name = os.environ.get("BAPX_AGENT_NAME", "BapX")
user_name = os.environ.get("BAPX_USER_NAME", "User")
soul_md = os.environ.get("BAPX_SOUL_MD", "")
provider = os.environ.get("BAPX_PROVIDER", "openai")
api_key = os.environ.get("BAPX_API_KEY", "")
model = os.environ.get("BAPX_MODEL", "gpt-4o")

# NOTE: OpenAI Agents SDK uses OpenAI-compatible API format.
# Anthropic and Google use non-compatible APIs requiring their own SDKs.
# For Anthropic access: use OpenRouter with "anthropic/claude-sonnet-4" model.
if api_key:
    set_default_openai_key(api_key)

if provider == "openai":
    set_default_openai_base_url("https://api.openai.com/v1")
elif provider == "openrouter":
    set_default_openai_base_url("https://openrouter.ai/api/v1")
elif provider == "custom":
    set_default_openai_base_url(os.environ.get("BAPX_CUSTOM_BASE_URL", "https://api.openai.com/v1"))
elif provider in ("anthropic", "google"):
    # Anthropic/Google APIs are NOT OpenAI-compatible with openai-agents SDK.
    # Log a warning and fall back. Users should use OpenRouter for these.
    import logging
    logging.warning(f"Provider '{provider}' is not OpenAI-compatible. "
                    "OpenAI Agents SDK only supports OpenAI-compatible endpoints. "
                    "Use OpenRouter or a custom proxy for Anthropic/Google models.")
    set_default_openai_base_url("https://api.openai.com/v1")
else:
    set_default_openai_base_url("https://api.openai.com/v1")

instructions = f"""{soul_md}

You are {agent_name}, {user_name}'s personal autonomous AI agent.
You have access to tools. Be proactive and helpful.

Your workspace is at /home/user/. Create files there.
Projects go in /home/user/projects/
Images go in /home/user/images/
Websites go in /home/user/websites/
Documents go in /home/user/documents/
Presentations go in /home/user/presentations/
Downloads go in /home/user/downloads/
"""

agent = Agent(
    name=agent_name,
    instructions=instructions,
    model=model if model else "gpt-4o",
    tools=[
        WebSearchTool(),
        ComputerTool(),
        read_file,
        write_file,
        list_files,
        run_python,
    ]
)

# ── Chat Request ──
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    history: list[dict] | None = None

@app.get("/health")
async def health(request: Request):
    await verify_auth(request)
    return {"status": "ok", "service": "bapx-agent", "agent": agent_name}

@app.post("/chat")
async def chat(req: ChatRequest, request: Request):
    await verify_auth(request)

    async def stream():
        try:
            # Build messages from history + new message
            messages = []
            if req.history:
                messages.extend(req.history)
            messages.append({"role": "user", "content": req.message})

            # Run agent with streaming
            result = Runner.run_streamed(agent, messages)
            full_content = ""

            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    if hasattr(event.data, 'delta') and event.data.delta:
                        full_content += event.data.delta
                        yield f"data: {json.dumps({'text': event.data.delta})}\n\n"
                elif event.type == "run_item_stream_event":
                    if event.item and hasattr(event.item, 'type'):
                        if event.item.type == "tool_call":
                            tc_data = json.dumps({"tool_call": {"name": event.item.name, "args": str(event.item.args)[:200]}})
                            yield f"data: {tc_data}\n\n"

            yield f"data: {json.dumps({'done': True, 'sessionId': req.session_id or str(uuid.uuid4())})}\n\n"

        except Exception as e:
            # Sanitize error — never expose raw exception details to client
            yield f"data: {json.dumps({'error': 'An internal error occurred while processing your request'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AGENT_PORT", "8765"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
