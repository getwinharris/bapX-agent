"""
bapX Agent Orchestrator — OpenAI Agents SDK agent teams.

Routes user messages to the right agent based on intent:
- CodexAgent: delegates coding/execution tasks to Codex CLI
- TTSAgent: generates speech via TTS endpoint
- MemoryAgent: handles cross-session memory operations
- Root router: classifies intent and delegates to the right agent
"""
import json, os, subprocess, uuid, asyncio
from datetime import datetime, timezone
from typing import Optional

from agents import Agent, Runner, RunConfig, function_tool, WebSearchTool
from agents.models.multi_provider import MultiProvider
from openai import AsyncOpenAI

# Codex binary — platform agent runtime for user sessions
CODEX_BIN = "/usr/local/bin/bapXcodex"

# --- Tools ---

@function_tool
def codex_execute(prompt: str) -> str:
    """Execute a coding/analysis task via Codex CLI.
    Use this for complex coding, code review, debugging, or file operations.
    The prompt should be a self-contained instruction for Codex.
    """
    codex_bin = CODEX_BIN
    if not os.path.exists(codex_bin):
        return "Codex CLI not found"
    try:
        result = subprocess.run(
            [codex_bin, "exec", prompt],
            capture_output=True,
            text=True,
            timeout=120,
            env={**os.environ, "CODEX_API_KEY": os.environ.get("CODEX_API_KEY", "")},
        )
        output = result.stdout + result.stderr
        if result.returncode != 0:
            output = f"Codex exit code {result.returncode}:\n{output}"
        return output[:10000]
    except subprocess.TimeoutExpired:
        return "Codex execution timed out after 120 seconds."
    except Exception as e:
        return f"Codex execution error: {str(e)}"


@function_tool
def tts_generate(text: str, voice: str = "Bella") -> str:
    """Generate TTS audio from text.
    Args:
        text: The text to speak (max 2000 chars)
        voice: Voice name (Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo)
    Returns:
        Status message with file path.
    """
    from kittentts import KittenTTS
    import tempfile

    text = text.strip()[:2000]
    try:
        tts = KittenTTS()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp_path = tmp.name
        tmp.close()
        tts.generate_to_file(text, tmp_path, voice=voice)
        return f"TTS generated: {tmp_path}"
    except Exception as e:
        return f"TTS error: {str(e)}"


@function_tool
def memory_store(key: str, value: str, user_id: str = "") -> str:
    """Store a memory for cross-session recall.
    Args:
        key: Memory key (short identifier)
        value: Memory content
        user_id: User ID (passed automatically)
    Returns:
        Confirmation message.
    """
    from pathlib import Path
    data_dir = Path(os.environ.get("BAPX_DATA_DIR", "/root/Dev/bapx/data"))
    mem_file = data_dir / "memories.json"
    mem_file.parent.mkdir(parents=True, exist_ok=True)

    memories = {}
    if mem_file.exists():
        try:
            memories = json.loads(mem_file.read_text())
        except (json.JSONDecodeError, Exception):
            memories = {}
    memories[key] = {
        "value": value,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    mem_file.write_text(json.dumps(memories, indent=2))
    return f"Memory saved: {key}"


@function_tool
def memory_query(key: str = "", user_id: str = "") -> str:
    """Query stored memories.
    Args:
        key: Optional specific key to look up. Empty returns all.
        user_id: User ID (passed automatically)
    Returns:
        JSON string of matching memories.
    """
    from pathlib import Path
    data_dir = Path(os.environ.get("BAPX_DATA_DIR", "/root/Dev/bapx/data"))
    mem_file = data_dir / "memories.json"
    if not mem_file.exists():
        return "No memories stored."
    try:
        memories = json.loads(mem_file.read_text())
    except (json.JSONDecodeError, Exception):
        return "Error reading memories."
    if key:
        result = {key: memories.get(key)}
    else:
        result = memories
    return json.dumps(result, indent=2)


@function_tool
def sandbox_Codex_run(message: str, sandbox_id: str = "") -> str:
    """Run a message through Codex CLI inside a user's sandbox.
    The sandbox must already exist and be running.
    Falls back to local Codex if sandbox is unavailable.
    """
    import httpx
    # Try running via sandbox proxy exec first
    if sandbox_id:
        try:
            resp = httpx.post(
                f"http://127.0.0.1:8080/v1/sandboxes/{sandbox_id}/exec",
                json={"command": f"bapXcodex exec '{message}'"},
                timeout=60,
            )
            if resp.status_code < 500:
                data = resp.json()
                return data.get("output", data.get("stdout", str(data)))
        except Exception:
            pass
    # Fallback: local Codex
    return codex_execute(message)


# ── Agent Definitions ──

def make_codex_agent() -> Agent:
    """Codex agent — handles coding, execution, and file operations."""
    return Agent(
        name="CodexAgent",
        instructions="""You are the Codex coding agent. Your job is to handle:
- Writing, reviewing, and debugging code
- Running shell commands and scripts
- File analysis and manipulation
- Any technical/engineering task

Use the codex_execute tool for complex coding tasks.
Use sandbox_Codex_run for tasks that need sandbox isolation.
Be thorough and precise. Always explain what you're doing.""",
        tools=[codex_execute, sandbox_Codex_run, WebSearchTool()],
    )


def make_tts_agent() -> Agent:
    """TTS agent — handles speech generation."""
    return Agent(
        name="TTSAgent",
        instructions="""You are the TTS (Text-to-Speech) agent. Your job is to:
- Convert text to spoken audio
- Handle voice selection and audio output

Use the tts_generate tool to create speech.
Available voices: Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo.
Keep responses concise.""",
        tools=[tts_generate],
    )


def make_memory_agent() -> Agent:
    """Memory agent — handles cross-session memory operations."""
    return Agent(
        name="MemoryAgent",
        instructions="""You are the Memory agent. Your job is to:
- Store important information for cross-session recall
- Retrieve stored memories on demand
- Manage memory keys and values

Use memory_store to save information.
Use memory_query to retrieve information.
Be proactive about storing useful context that will help in future sessions.""",
        tools=[memory_store, memory_query],
    )


def make_router_agent() -> Agent:
    """Router agent — classifies intent and delegates to the right specialist."""
    codex = make_codex_agent()
    tts = make_tts_agent()
    memory = make_memory_agent()

    return Agent(
        name="BapXRouter",
        instructions="""You are the BapX router agent. Route user messages to the right specialist:

1. **CodexAgent** — for coding, execution, debugging, file operations, technical questions
2. **TTSAgent** — for text-to-speech, voice generation, audio output
3. **MemoryAgent** — for saving/retrieving information across sessions

For general conversation, Q&A, or tasks that don't fit a specialist, handle them yourself.
Be helpful and conversational. When in doubt, handle it yourself.""",
        handoffs=[codex, tts, memory],
        tools=[WebSearchTool()],
    )


async def route_user_message(
    user_message: str,
    user_id: str = "",
    sandbox_id: str = "",
    conversation_history: list[dict] | None = None,
):
    """Route a user message through the agent team.
    Yields SSE-formatted data lines.
    """
    router = make_router_agent()

    # Build input with context
    context_parts = [f"User message: {user_message}"]
    if user_id:
        context_parts.append(f"User ID: {user_id}")
    if sandbox_id:
        context_parts.append(f"Sandbox ID: {sandbox_id}")

    input_text = "\n".join(context_parts)

    # Create SDK messages from conversation history
    sdk_messages = []
    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant"):
                sdk_messages.append({"role": role, "content": content})

    sdk_messages.append({"role": "user", "content": input_text})

    # Create MultiProvider with default OpenAI client
    # Uses environment's default or falls back to basic setup
    api_key = os.environ.get("OPENAI_API_KEY", "")
    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    provider = MultiProvider(openai_client=client)
    run_config = RunConfig(model_provider=provider)

    try:
        result = Runner.run_streamed(router, input=sdk_messages, run_config=run_config)

        async for event in result.stream_events():
            if event.type == "raw_response_event":
                data = event.data
                if hasattr(data, "delta") and data.delta:
                    yield f"data: {json.dumps({'text': data.delta})}\n\n"
            elif event.type == "run_item_stream_event":
                item = event.item
                if hasattr(item, "type"):
                    if item.type == "tool_call":
                        yield f"data: {json.dumps({'tool_call': {'name': getattr(item, 'name', 'unknown')}})}\n\n"
                    elif hasattr(item, "handoff_output") and item.handoff_output:
                        yield f"data: {json.dumps({'handoff': str(item.handoff_output)[:200]})}\n\n"

        final = result.final_output
        if final:
            yield f"data: {json.dumps({'final': final})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': f'Orchestrator error: {str(e)}'})}\n\n"

    yield "data: [DONE]\n\n"
