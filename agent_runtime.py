"""
bapX Agent Runtime — OpenAI Agents SDK integration.

Creates agents per user with their configured provider/model.
Streams responses via SSE for the /api/agent/run endpoint.
"""
import json, uuid
from typing import Optional
from openai import AsyncOpenAI
from agents import Agent, Runner, RunConfig, WebSearchTool, function_tool
from agents.models.multi_provider import MultiProvider

# ── Provider base URL map (mirrors backend.py ALL_PROVIDERS) ──
PROVIDER_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "google": "https://generativelanguage.googleapis.com/v1beta",
    "deepseek": "https://api.deepseek.com/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "xai": "https://api.x.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "together": "https://api.together.xyz/v1",
    "cohere": "https://api.cohere.com/v1",
    "perplexity": "https://api.perplexity.ai",
    "huggingface": "https://api-inference.huggingface.co/v1",
    "minimax": "https://api.minimax.chat/v1",
    "kimi": "https://api.moonshot.cn/v1",
    "xiaomi": "https://api.mimo.one/v1",
    "zai": "https://open.bigmodel.cn/api/paas/v4",
    "dashscope": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "stepfun": "https://api.stepfun.com/v1",
}


def resolve_auth(user: dict) -> tuple[str, str, str]:
    """Resolve auth credential and base URL for a user's configured provider.
    Returns (credential, base_url, model_name).
    """
    provider = user.get("provider", "openai")
    model = user.get("model", "gpt-4o")
    api_key = user.get("api_key", "")

    # Check OAuth tokens
    oauth_tokens_json = user.get("oauth_tokens", "{}")
    try:
        oauth_tokens = json.loads(oauth_tokens_json) if isinstance(oauth_tokens_json, str) else oauth_tokens_json or {}
    except (json.JSONDecodeError, TypeError):
        oauth_tokens = {}

    # Try API key first, then OAuth
    credential = api_key or oauth_tokens.get(provider, "")

    # Handle special providers
    if provider == "github-copilot":
        base_url = "https://api.githubcopilot.com/v1"
    else:
        base_url = PROVIDER_URLS.get(provider, "https://api.openai.com/v1")

    return credential, base_url, model


def make_instructions(user: dict) -> str:
    """Build agent instructions from user's SOUL.md and other profile data."""
    soul_md = user.get("soul_md", "")
    agent_name = user.get("agent_name", "BapX")
    bio = user.get("bio", "")

    parts = [
        f"# Agent Profile",
        f"**Agent Name:** {agent_name}",
        f"**User:** {user.get('name', 'User')} ({user.get('username', '')})",
    ]

    if bio:
        parts.append(f"\n**Bio:** {bio}")

    if soul_md:
        parts.append(f"\n## SOUL.md\n{soul_md}")

    parts.append("""
## Guidelines
- You are an autonomous agent capable of completing complex tasks.
- Use Web Search when you need current information.
- File operations and code execution happen through tools.
- Be helpful, precise, and thorough.
""")

    return "\n\n".join(parts)


@function_tool
def sandbox_execute(code: str, language: str = "python") -> str:
    """Execute code or shell commands in the user's sandbox.
    Use this for running Python scripts, shell commands, git operations, etc.
    Returns stdout/stderr output (truncated to 5000 chars).
    """
    import httpx
    # In Phase 1, fall back to local execution via subprocess
    # Phase 2+ will route through OpenSandbox proxy
    import subprocess, shlex
    try:
        if language == "python":
            result = subprocess.run(["python3", "-c", code], capture_output=True, text=True, timeout=30)
        elif language in ("bash", "shell", "sh"):
            result = subprocess.run(["bash", "-c", code], capture_output=True, text=True, timeout=30)
        else:
            return f"Unsupported language: {language}. Use python or bash."
        output = result.stdout + result.stderr
        if result.returncode != 0:
            output = f"Exit code: {result.returncode}\n{output}"
        return output[:5000]
    except subprocess.TimeoutExpired:
        return "Execution timed out after 30 seconds."
    except Exception as e:
        return f"Execution error: {str(e)}"


async def stream_agent_response(
    user: dict,
    messages: list[dict],
    enabled_skills: list[dict] | None = None,
):
    """Create an agent for the user and stream its response.
    Yields SSE-formatted data lines.
    """
    credential, base_url, model = resolve_auth(user)
    if not credential:
        yield f"data: {json.dumps({'error': 'No API key or OAuth token configured. Go to Settings → Connection to configure.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    # Build instructions with skills
    instructions = make_instructions(user)
    if enabled_skills:
        skills_text = "\n".join(
            f"- **{s['name']}**: {s.get('description', '')}"
            for s in enabled_skills if isinstance(s, dict)
        )
        instructions += f"\n\n## Available Skills\n{skills_text}"

    # Create AsyncOpenAI client pointing to user's provider
    client = AsyncOpenAI(api_key=credential, base_url=base_url)

    # Create MultiProvider with the user's client
    provider = MultiProvider(openai_client=client)
    run_config = RunConfig(model_provider=provider)

    # Create agent
    agent = Agent(
        name=user.get("agent_name", "BapX"),
        instructions=instructions,
        model=model,
        tools=[
            WebSearchTool(),
            sandbox_execute,
        ],
    )

    # Convert messages to SDK format
    sdk_messages = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            sdk_messages.append({"role": role, "content": content})

    try:
        result = Runner.run_streamed(agent, input=sdk_messages, run_config=run_config)

        async for event in result.stream_events():
            if event.type == "raw_response_event":
                # Check if it's a text delta event
                data = event.data
                if hasattr(data, "delta") and data.delta:
                    yield f"data: {json.dumps({'text': data.delta})}\n\n"
            elif event.type == "run_item_stream_event":
                item = event.item
                if hasattr(item, "type"):
                    if item.type == "tool_call":
                        yield f"data: {json.dumps({'tool_call': {'name': getattr(item, 'name', 'unknown')}})}\n\n"
                    elif item.type == "tool_call_output":
                        yield f"data: {json.dumps({'tool_output': True})}\n\n"

        # Final output
        final = result.final_output
        if final:
            yield f"data: {json.dumps({'final': final})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': f'Agent runtime error: {str(e)}'})}\n\n"

    yield "data: [DONE]\n\n"
