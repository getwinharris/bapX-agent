import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MemorySystem } from './memory';
import { SkillsSystem } from './skills';

// ── Type definitions ────────────────────────────────────────────────

export interface ToolSchema {
  type: 'object';
  properties?: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    [key: string]: unknown;
  }>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolSchema;
  };
}

export type ToolHandler = (args: Record<string, unknown>, context: ToolContext) => Promise<string>;

export interface ToolContext {
  userId: string;
  memory: MemorySystem;
  skills: SkillsSystem;
  workingDir: string;
}

/** Result of executing a tool call. */
export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
}

// ── Tool Registry ───────────────────────────────────────────────────

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, { description: string; schema: ToolSchema; handler: ToolHandler }>();

  private constructor() {}

  /** Get the singleton instance. */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /** Register a tool. */
  register(name: string, description: string, schema: ToolSchema, handler: ToolHandler): void {
    this.tools.set(name, { description, schema, handler });
  }

  /** Get the tool definition in OpenAI-format for API calls. */
  getToolDefinitions(): ToolDefinition[] {
    const defs: ToolDefinition[] = [];
    for (const [name, tool] of this.tools) {
      defs.push({
        type: 'function',
        function: {
          name,
          description: tool.description,
          parameters: tool.schema,
        },
      });
    }
    return defs;
  }

  /** Check if a tool is registered. */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Execute a tool by name. */
  async execute(name: string, args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.handler(args, context);
  }

  /** Get all registered tool names. */
  list(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Reset all tools (for testing). */
  reset(): void {
    this.tools.clear();
  }
}

// ── Built-in Tools ──────────────────────────────────────────────────

/** Register all built-in tools. */
export function registerBuiltinTools(): void {
  const registry = ToolRegistry.getInstance();

  // read_file — reads file content
  registry.register(
    'read_file',
    'Read the contents of a file at the given path. Use offset and limit for large files.',
    {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
        offset: { type: 'number', description: 'Line number to start from (1-indexed)' },
        limit: { type: 'number', description: 'Maximum number of lines to read' },
      },
      required: ['path'],
    },
    async (args) => {
      const filePath = args.path as string;
      const offset = (args.offset as number) || 1;
      const limit = (args.limit as number) || 500;

      const resolved = path.resolve(filePath);
      if (!fs.existsSync(resolved)) {
        return `Error: File not found: ${filePath}`;
      }
      if (fs.statSync(resolved).size > 10 * 1024 * 1024) {
        return `Error: File too large (>10MB). Use offset and limit to read specific sections.`;
      }

      const content = fs.readFileSync(resolved, 'utf-8');
      const lines = content.split('\n');
      const startIdx = Math.max(0, offset - 1);
      const selected = lines.slice(startIdx, startIdx + limit);

      return selected.map((line, i) => `${startIdx + i + 1}|${line}`).join('\n');
    }
  );

  // write_file — writes file
  registry.register(
    'write_file',
    'Write content to a file. Creates parent directories automatically. Overwrites existing content.',
    {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
    async (args) => {
      const filePath = args.path as string;
      const content = args.content as string;
      const resolved = path.resolve(filePath);

      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, content, 'utf-8');

      return `File written: ${filePath} (${Buffer.byteLength(content, 'utf-8')} bytes)`;
    }
  );

  // search_files — searches file contents
  registry.register(
    'search_files',
    'Search file contents using regex pattern, or find files by name pattern.',
    {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern for content search, or glob pattern for file search' },
        path: { type: 'string', description: 'Directory or file to search in' },
        target: { type: 'string', enum: ['content', 'files'], description: "'content' for text search, 'files' for filename search" },
        file_glob: { type: 'string', description: 'Filter files by pattern in content search mode' },
        limit: { type: 'number', description: 'Maximum results to return' },
      },
      required: ['pattern'],
    },
    async (args) => {
      const pattern = args.pattern as string;
      const searchPath = (args.path as string) || '.';
      const target = (args.target as string) || 'content';
      const fileGlob = args.file_glob as string | undefined;
      const limit = (args.limit as number) || 50;

      const resolvedPath = path.resolve(searchPath);
      if (!fs.existsSync(resolvedPath)) {
        return `Error: Path not found: ${searchPath}`;
      }

      try {
        let results: string[] = [];

        if (target === 'files') {
          // Simple filename pattern search
          const files = findAllFiles(resolvedPath, pattern);
          results = files.slice(0, limit).map(f => path.relative(resolvedPath, f));
        } else {
          // Content search with grep
          const grepCmd = buildGrepCommand(pattern, resolvedPath, fileGlob, limit);
          if (grepCmd) {
            try {
              const output = execSync(grepCmd, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024,
                timeout: 30000,
              });
              results = output.trim().split('\n').filter(Boolean);
              if (results.length > limit) {
                results = results.slice(0, limit);
                results.push(`... and ${results.length - limit} more results`);
              }
            } catch {
              results = ['No matches found'];
            }
          }
        }

        return results.length > 0 ? results.join('\n') : 'No results found';
      } catch (err) {
        return `Error searching files: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  );

  // terminal — executes bash commands
  registry.register(
    'terminal',
    'Execute a bash command in the shell. Returns stdout + stderr output.',
    {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to execute' },
        timeout: { type: 'number', description: 'Max seconds to wait (default: 30)' },
        workdir: { type: 'string', description: 'Working directory for the command' },
      },
      required: ['command'],
    },
    async (args) => {
      const command = args.command as string;
      const timeout = ((args.timeout as number) || 30) * 1000;
      const workdir = args.workdir as string | undefined;

      // Safety check — no interactive commands
      const blockedPatterns = ['vim', 'nano', 'less ', 'more ', 'htop', 'top'];
      for (const bp of blockedPatterns) {
        if (command.startsWith(bp) || command.includes(` ${bp}`)) {
          return `Error: Interactive command '${bp}' is not allowed via terminal tool.`;
        }
      }

      try {
        const output = execSync(command, {
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
          timeout,
          cwd: workdir ? path.resolve(workdir) : undefined,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return output || '(command completed with no output)';
      } catch (err) {
        if (err instanceof Error) {
          const execErr = err as { stdout?: string; stderr?: string };
          const stderr = execErr.stderr || '';
          const stdout = execErr.stdout || '';
          const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
          return combined || `Error: ${err.message}`;
        }
        return `Error: ${String(err)}`;
      }
    }
  );

  // web_search — searches the web
  registry.register(
    'web_search',
    'Search the web for information. Returns a list of results with titles, URLs, and snippets.',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results to return (default: 5)' },
      },
      required: ['query'],
    },
    async (args) => {
      const query = args.query as string;
      const count = (args.count as number) || 5;

      try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; bapX-Agent/0.1)',
          },
        });

        if (!response.ok) {
          return `Web search failed with status ${response.status}`;
        }

        const html = await response.text();

        // Simple extraction of search result links
        const results: string[] = [];
        const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

        let match: RegExpExecArray | null;
        const links: string[] = [];
        const titles: string[] = [];
        const snippets: string[] = [];

        while ((match = linkRegex.exec(html)) !== null && links.length < count) {
          let href = match[1];
          if (href.startsWith('//')) href = 'https:' + href;
          const title = match[2].replace(/<[^>]*>/g, '').trim();
          links.push(href);
          titles.push(title);
        }

        while ((match = snippetRegex.exec(html)) !== null && snippets.length < count) {
          snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
        }

        for (let i = 0; i < Math.min(links.length, count); i++) {
          const snippet = snippets[i] || '';
          results.push(`${i + 1}. ${titles[i] || 'No title'}\n   URL: ${links[i]}\n   ${snippet}`);
        }

        return results.length > 0
          ? results.join('\n\n')
          : 'No search results found. The web search may be rate-limited.';
      } catch (err) {
        return `Web search failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  );

  // web_extract — fetches URL content
  registry.register(
    'web_extract',
    'Fetch the content of a URL and extract readable text.',
    {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        selector: { type: 'string', description: 'Optional CSS-like selector for targeted extraction' },
      },
      required: ['url'],
    },
    async (args) => {
      const url = args.url as string;

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; bapX-Agent/0.1)',
            'Accept': 'text/html,text/plain,*/*',
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          return `Failed to fetch URL: ${response.status} ${response.statusText}`;
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (contentType.includes('text/html')) {
          // Strip HTML tags for readability
          const cleaned = text
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          // Truncate to avoid enormous responses
          const maxLen = 10000;
          return cleaned.length > maxLen
            ? cleaned.substring(0, maxLen) + `\n\n... [truncated: ${cleaned.length - maxLen} more characters]`
            : cleaned;
        }

        // Non-HTML content
        const maxLen = 10000;
        return text.length > maxLen
          ? text.substring(0, maxLen) + `\n\n... [truncated: ${text.length - maxLen} more characters]`
          : text;
      } catch (err) {
        return `Failed to fetch URL: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  );

  // memory_add — saves to memory
  registry.register(
    'memory_add',
    'Save a piece of information to the agent\'s persistent memory. This information will be available in future conversations via memory_search.',
    {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Content to remember' },
      },
      required: ['content'],
    },
    async (args, context) => {
      const content = args.content as string;
      const entry = context.memory.save(context.userId, content);
      return `Memory saved (id: ${entry.id})`;
    }
  );

  // memory_search — searches memory
  registry.register(
    'memory_search',
    'Search the agent\'s persistent memory using full-text search. Returns relevant memories from past conversations.',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Maximum results (default: 10)' },
      },
      required: ['query'],
    },
    async (args, context) => {
      const query = args.query as string;
      const limit = (args.limit as number) || 10;
      const results = context.memory.search(context.userId, query, limit);

      if (results.length === 0) {
        return 'No memories found matching that query.';
      }

      return results
        .map((r, i) => `[${i + 1}] (${r.created_at}) ${r.content}`)
        .join('\n\n');
    }
  );

  // skill_view — loads a skill
  registry.register(
    'skill_view',
    'Load and view a skill from the skills directory. Skills provide specialized knowledge and capabilities.',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the skill to load' },
      },
      required: ['name'],
    },
    async (args, context) => {
      const name = args.name as string;
      const skill = context.skills.load(name);
      if (!skill) {
        return `Skill not found: ${name}. Use skills_list to see available skills.`;
      }
      return `# ${skill.meta.name}\n\n${skill.meta.description ? `*${skill.meta.description}*\n\n` : ''}${skill.content}`;
    }
  );

  // skills_list — lists available skills
  registry.register(
    'skills_list',
    'List all available skills, optionally filtered by category.',
    {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
      },
      required: [],
    },
    async (args, context) => {
      const category = args.category as string | undefined;
      const skills = context.skills.list(category);

      if (skills.length === 0) {
        return category
          ? `No skills found in category: ${category}`
          : 'No skills found. Skills are loaded from ~/.bapx/skills/';
      }

      const lines = skills.map(s =>
        `- **${s.name}**${s.description ? `: ${s.description}` : ''}${s.category ? ` [${s.category}]` : ''}`
      );
      return `Available skills (${skills.length}):\n\n${lines.join('\n')}`;
    }
  );
}

// ── Helper Functions ────────────────────────────────────────────────

/** Recursively find all files matching a glob-like pattern. */
function findAllFiles(dir: string, pattern: string): string[] {
  const results: string[] = [];
  const patternRegex = globToRegex(pattern);

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          results.push(...findAllFiles(fullPath, pattern));
        }
      } else if (patternRegex.test(entry.name) || patternRegex.test(fullPath)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results;
}

/** Convert a simple glob pattern to a regex. */
function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  for (const ch of pattern) {
    if (ch === '*') {
      regexStr += '.*';
    } else if (ch === '?') {
      regexStr += '.';
    } else if (ch === '.') {
      regexStr += '\\.';
    } else {
      regexStr += ch;
    }
  }
  return new RegExp(`^${regexStr}$`, 'i');
}

/** Build a grep command for content search. */
function buildGrepCommand(pattern: string, searchPath: string, fileGlob?: string, limit?: number): string | null {
  if (!pattern) return null;

  let cmd = `grep -rnI --max-count=5`;

  // Escape the pattern for shell safety
  const escapedPattern = pattern.replace(/'/g, "'\\''");
  cmd += ` '${escapedPattern}'`;

  if (fileGlob) {
    cmd += ` --include='${fileGlob.replace(/'/g, "'\\''")}'`;
  }

  // Exclude common noisy directories
  cmd += ` --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.cache`;

  cmd += ` '${searchPath.replace(/'/g, "'\\''")}'`;

  if (limit) {
    cmd += ` | head -${limit}`;
  }

  return cmd;
}
