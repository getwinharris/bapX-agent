# OpenAI Agents SDK — Knowledge Graph

> Source: 108 docs from github.com/openai/openai-agents-python

## Architecture

```
Runner.run() / Runner.run_streamed()
    ↓
Agent(name, instructions, tools, guardrails, handoffs, output_type)
    ↓
Agent Loop: LLM → tool calls → handoffs → final output (max_turns)
    ↓
Session persistence → SQLite/Redis/MongoDB
Tracing → OpenAI Dashboard / custom processors
```

## Core Primitives

### Agent
```python
agent = Agent(
    name="AgentName",
    instructions="System prompt here",  # static str or callable(context, agent)
    model="gpt-4o",
    tools=[function_tool, WebSearchTool(), ComputerTool()],
    handoffs=[billing_agent, refund_agent],
    input_guardrails=[guardrail_fn],
    output_guardrails=[guardrail_fn],
    output_type=PydanticModel,  # structured output
    model_settings=ModelSettings(temperature=0.7),
    hooks=LoggingHooks(),
    mcp_servers=[MCPServer],  # can register MCP servers
    tool_use_behavior="run_llm_again"  # or "stop_on_first_tool"
)
```

### Runner
- `Runner.run(agent, input, context=my_ctx, session=session)` → RunResult
- `Runner.run_streamed(agent, input, ...)` → RunResultStreaming
- Stream events: raw_response_event, run_item_stream_event, agent_updated_stream_event

### Tools (5 categories)
1. **Hosted OpenAI**: WebSearchTool(), FileSearchTool(), CodeInterpreterTool(), ImageGenerationTool()
2. **Local runtime**: ComputerTool (GUI/browser), ShellTool (CLI), ApplyPatchTool
3. **Function tools**: @function_tool decorator — auto-extracts schema from type hints + docstrings
4. **Agents as tools**: span_agent.as_tool(tool_name="translate", ...)
5. **MCP**: HostedMCPTool, MCP server registry

### Handoffs
- Specialized agents take over conversation
- `handoff()` with on_handoff callback, input_type, input_filter
- Input filters: remove_all_tools, etc.

### Guardrails
- Input guardrails (on initial input)
- Output guardrails (on final output)
- Tool guardrails (before/after tool calls)
- Tripwire mechanism: raise GuardrailTripwireTriggered

### Sessions (Persistence)
- SQLiteSession, AsyncSQLiteSession, RedisSession, MongoDBSession, EncryptedSession
- Auto-persist conversation history between runs
- SessionSettings(limit=N) for max history length

### Streaming
```python
async for event in result.stream_events():
    if event.type == "raw_response_event":
        delta = event.data.delta  # token-by-token text
    elif event.type == "run_item_stream_event":
        # tool_called, tool_output, message_output, handoff, etc.
    elif event.type == "agent_updated_stream_event":
        print(f"Switched to: {event.new_agent.name}")
```

### Multi-Agent Patterns
1. **Manager pattern**: Central agent calls sub-agents as tools (keeps control)
2. **Handoff pattern**: Agents pass conversation to specialized agents

## Key Patterns for bapX
- Agent[UserContext]: generic agents typed with context
- `Runner.run_streamed()` + SSE = streaming responses to frontend
- @function_tool for custom tools (sandbox operations, file ops, MCP calls)
- sessions: SQLiteSession per user for chat persistence
- Tools: WebSearchTool, ComputerTool, ShellTool for sandbox agent
- Context injection: `context=UserContext(username, agent_name, soul_md)`
