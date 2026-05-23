import { MemorySystem } from './memory';
import { SkillsSystem } from './skills';
import { ToolRegistry, ToolContext, ToolResult, ToolDefinition, registerBuiltinTools } from './tools';

// ── Type Definitions ─────────────────────────────────────────────────

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: Role;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ProviderType = 'openai' | 'anthropic' | 'openrouter' | 'google' | 'custom';

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;       // Custom endpoint URL
  maxTokens?: number;
  temperature?: number;
}

export interface AgentConfig {
  provider: ProviderConfig;
  userId: string;
  systemPrompt?: string;
  maxToolIterations?: number;
  memory?: MemorySystem;
  skills?: SkillsSystem;
  workingDir?: string;
}

export interface AgentResult {
  messages: Message[];
  finalContent: string;
  toolCallsMade: number;
}

// ── Provider Adapters ───────────────────────────────────────────────

interface ChatCompletionRequest {
  model: string;
  messages: { role: string; content: string | null }[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
}

/**
 * Convert our unified message format to each provider's API format
 * and parse responses back into our format.
 */
export interface ProviderAdapter {
  /** Convert messages to the provider's request format and make the API call. */
  chat(
    messages: Message[],
    tools: ToolDefinition[],
    config: ProviderConfig
  ): Promise<Message>;
}

/** OpenAI adapter (also works for OpenRouter with baseUrl override). */
class OpenAIAdapter implements ProviderAdapter {
  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    config: ProviderConfig
  ): Promise<Message> {
    const body: ChatCompletionRequest = {
      model: config.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
    };

    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const choice = data.choices[0];
    if (!choice) {
      throw new Error('No response choices returned from API');
    }

    const msg: Message = {
      role: 'assistant',
      content: choice.message.content,
    };

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      msg.tool_calls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    return msg;
  }
}

/** Anthropic adapter (Claude) — converts to/from Anthropic's Messages API format. */
class AnthropicAdapter implements ProviderAdapter {
  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    config: ProviderConfig
  ): Promise<Message> {
    // Anthropic requires system as a separate parameter, not in messages
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    // Convert our message format to Anthropic format
    const anthropicMessages = otherMessages.map(m => {
      if (m.role === 'assistant' && m.tool_calls) {
        // Assistant message with tool calls
        return {
          role: 'assistant' as const,
          content: [
            ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
            ...m.tool_calls.map(tc => ({
              type: 'tool_use' as const,
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            })),
          ],
        };
      }
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: m.tool_call_id!,
              content: m.content || '',
            },
          ],
        };
      }
      return {
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content || '',
      };
    });

    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: config.maxTokens ?? 4096,
      messages: anthropicMessages,
    };

    // Map our tool definitions to Anthropic's tool format
    if (tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters as Record<string, unknown>,
      }));
    }

    // System prompt as separate parameter
    if (systemMsg?.content) {
      body.system = systemMsg.content;
    }

    const baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      id: string;
      content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
      stop_reason?: string;
    };

    const msg: Message = { role: 'assistant', content: null };
    const toolCalls: ToolCall[] = [];
    let textParts: string[] = [];

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id || `tc_${toolCalls.length}`,
          type: 'function',
          function: {
            name: block.name || '',
            arguments: JSON.stringify(block.input || {}),
          },
        });
      }
    }

    if (textParts.length > 0) {
      msg.content = textParts.join('\n');
    }
    if (toolCalls.length > 0) {
      msg.tool_calls = toolCalls;
    }

    return msg;
  }
}

/** Google Gemini adapter — converts to/from Gemini's API format. */
class GoogleAdapter implements ProviderAdapter {
  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    config: ProviderConfig
  ): Promise<Message> {
    const systemMsg = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    // Convert to Gemini's "contents" format
    const contents: { role: string; parts: { text?: string; functionCall?: Record<string, unknown>; functionResponse?: Record<string, unknown> }[] }[] = [];

    for (const m of otherMessages) {
      if (m.role === 'tool' && m.tool_call_id) {
        // Tool results go to the last user message in Gemini
        if (contents.length > 0) {
          const lastContent = contents[contents.length - 1];
          lastContent.parts.push({
            functionResponse: {
              name: m.name || '',
              response: { content: m.content || '' },
            },
          });
        }
      } else if (m.tool_calls && m.tool_calls.length > 0) {
        const parts: { text?: string; functionCall?: Record<string, unknown> }[] = [];
        if (m.content) {
          parts.push({ text: m.content });
        }
        for (const tc of m.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments),
            },
          });
        }
        contents.push({ role: 'model', parts });
      } else {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }],
        });
      }
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? 4096,
        temperature: config.temperature ?? 0.7,
      },
    };

    // System instruction
    if (systemMsg?.content) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    // Tools
    if (tools.length > 0) {
      body.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      }];
    }

    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const modelName = config.model.startsWith('models/') ? config.model : `models/${config.model}`;
    const url = `${baseUrl}/${modelName}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google API error ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }[];
        };
        finishReason?: string;
      }[];
    };

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response candidates from Google API');
    }

    const msg: Message = { role: 'assistant', content: null };
    const toolCalls: ToolCall[] = [];
    const textParts: string[] = [];

    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        textParts.push(part.text);
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `fc_${toolCalls.length}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        });
      }
    }

    if (textParts.length > 0) {
      msg.content = textParts.join('\n');
    }
    if (toolCalls.length > 0) {
      msg.tool_calls = toolCalls;
    }

    return msg;
  }
}

/** Factory to get the right adapter for a provider type. */
function getAdapter(provider: ProviderType): ProviderAdapter {
  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'custom':
      return new OpenAIAdapter();
    case 'anthropic':
      return new AnthropicAdapter();
    case 'google':
      return new GoogleAdapter();
    default:
      return new OpenAIAdapter();
  }
}

// ── System Prompt Builder ───────────────────────────────────────────

/**
 * Build the system prompt, injecting loaded skills and recent memories.
 */
function buildSystemPrompt(
  basePrompt: string | undefined,
  userId: string,
  skills?: SkillsSystem,
  memory?: MemorySystem
): string {
  const parts: string[] = [];

  // Base system prompt or default
  parts.push(basePrompt || `You are bapX Agent, an intelligent AI assistant. You help users with a wide range of tasks including answering questions, writing and editing code, analyzing information, creative work, and executing actions via your tools.`);

  // Inject loaded skills
  if (skills) {
    const skillMetas = skills.list();
    if (skillMetas.length > 0) {
      parts.push('\n## Available Skills\n');
      parts.push('You have the following skills available. Use skill_view(name) to load a skill for detailed instructions.');
      for (const s of skillMetas) {
        parts.push(`- **${s.name}**: ${s.description || 'No description'}${s.category ? ` [${s.category}]` : ''}`);
      }
    }
  }

  // Inject recent memories for context
  if (memory) {
    try {
      const recentMemory = memory.list(userId, 10);
      if (recentMemory.length > 0) {
        parts.push('\n## Recent Memories\n');
        parts.push('These are memories from past interactions that may be relevant:');
        for (const mem of recentMemory) {
          parts.push(`- (${mem.created_at}) ${mem.content}`);
        }
      }
    } catch {
      // Memory not available
    }
  }

  // Tool usage instructions
  parts.push('\n## Tool Usage\n');
  parts.push('You have access to tools that you can call to accomplish tasks. When you need to perform an action, use the appropriate tool. You can call multiple tools in a single response if they are independent.');

  return parts.join('\n');
}

// ── Execute Tool Calls ──────────────────────────────────────────────

/**
 * Execute a set of tool calls and return the results.
 */
async function executeToolCalls(
  toolCalls: ToolCall[],
  context: ToolContext
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const tc of toolCalls) {
    try {
      const args = JSON.parse(tc.function.arguments);
      const content = await ToolRegistry.getInstance().execute(tc.function.name, args, context);
      results.push({
        tool_call_id: tc.id,
        name: tc.function.name,
        content,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        tool_call_id: tc.id,
        name: tc.function.name,
        content: `Error executing ${tc.function.name}: ${errorMsg}`,
      });
    }
  }

  return results;
}

// ── Main Agent Loop ─────────────────────────────────────────────────

/**
 * Run the main agent loop with the given messages and configuration.
 * This handles:
 *   - Building the system prompt with skills and memory injection
 *   - Provider adapters for multi-provider support
 *   - Tool calling loop (max 50 iterations)
 *   - Error recovery
 *
 * Returns the final message history and content.
 */
export async function runAgent(
  userMessages: { role: 'user'; content: string }[],
  config: AgentConfig
): Promise<AgentResult> {
  // Initialize subsystems if not provided
  const memory = config.memory || new MemorySystem();
  const skills = config.skills || new SkillsSystem();
  const maxIterations = config.maxToolIterations ?? 50;
  const workingDir = config.workingDir || process.cwd();

  // Ensure built-in tools are registered
  registerBuiltinTools();

  // Get the appropriate provider adapter
  const adapter = getAdapter(config.provider.type);

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(
    config.systemPrompt,
    config.userId,
    skills,
    memory
  );

  // Initialize message history
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];

  // Tool context shared across all tool executions
  const toolContext: ToolContext = {
    userId: config.userId,
    memory,
    skills,
    workingDir,
  };

  // Get tool definitions for the API
  const toolDefs = ToolRegistry.getInstance().getToolDefinitions();

  let toolCallsMade = 0;

  // Main agent loop
  for (let iteration = 0; iteration <= maxIterations; iteration++) {
    // Get assistant response
    let assistantMsg: Message;
    try {
      assistantMsg = await adapter.chat(messages, toolDefs, config.provider);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // Error recovery — append error to messages and continue
      messages.push({
        role: 'assistant',
        content: `I encountered an error communicating with the API: ${errorMsg}. Please try again.`,
      });
      // If we've had repeated failures, stop the loop
      if (iteration >= 3 && toolCallsMade === 0) {
        return { messages, finalContent: errorMsg, toolCallsMade };
      }
      continue;
    }

    messages.push(assistantMsg);

    // No tool calls? We're done
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      const finalContent = assistantMsg.content || '';
      return { messages, finalContent, toolCallsMade };
    }

    // Execute tool calls
    const toolResults = await executeToolCalls(assistantMsg.tool_calls, toolContext);
    toolCallsMade += toolResults.length;

    // Append tool results to messages
    for (const result of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: result.content.substring(0, 100000), // Truncate very long outputs
      });
    }

    // If we've hit max iterations, break and return the accumulated context
    if (iteration >= maxIterations - 1) {
      break;
    }
  }

  // Final response after tool loop completes or max iterations hit
  const lastMsg = messages[messages.length - 1];
  return {
    messages,
    finalContent: lastMsg?.content || 'Tool execution completed.',
    toolCallsMade,
  };
}

// ── Streaming Support ───────────────────────────────────────────────

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
}

/**
 * Run the agent with streaming support.
 * Yields chunks as they're produced.
 */
export async function* runAgentStream(
  userMessages: { role: 'user'; content: string }[],
  config: AgentConfig
): AsyncGenerator<StreamChunk> {
  const memory = config.memory || new MemorySystem();
  const skills = config.skills || new SkillsSystem();
  const maxIterations = config.maxToolIterations ?? 50;
  const workingDir = config.workingDir || process.cwd();

  registerBuiltinTools();

  const adapter = getAdapter(config.provider.type);
  const systemPrompt = buildSystemPrompt(config.systemPrompt, config.userId, skills, memory);

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];

  const toolContext: ToolContext = {
    userId: config.userId,
    memory,
    skills,
    workingDir,
  };

  const toolDefs = ToolRegistry.getInstance().getToolDefinitions();
  let toolCallsMade = 0;

  for (let iteration = 0; iteration <= maxIterations; iteration++) {
    let assistantMsg: Message;

    try {
      assistantMsg = await adapter.chat(messages, toolDefs, config.provider);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      yield { type: 'error', error: errorMsg };
      messages.push({
        role: 'assistant',
        content: `Error communicating with API: ${errorMsg}`,
      });
      if (iteration >= 3 && toolCallsMade === 0) {
        yield { type: 'done' };
        return;
      }
      continue;
    }

    messages.push(assistantMsg);

    if (assistantMsg.content) {
      yield { type: 'text', content: assistantMsg.content };
    }

    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      yield { type: 'done' };
      return;
    }

    // Yield tool calls
    for (const tc of assistantMsg.tool_calls) {
      yield { type: 'tool_call', toolCall: tc };
    }

    // Execute and yield results
    const toolResults = await executeToolCalls(assistantMsg.tool_calls, toolContext);
    toolCallsMade += toolResults.length;

    for (const result of toolResults) {
      yield { type: 'tool_result', toolResult: result };
      messages.push({
        role: 'tool',
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: result.content.substring(0, 100000),
      });
    }

    if (iteration >= maxIterations - 1) {
      break;
    }
  }

  yield { type: 'done' };
}
