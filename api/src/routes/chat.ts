import { FastifyInstance } from 'fastify'
import { v4 as uuid } from 'uuid'
import { execSync } from 'child_process'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

/**
 * In-memory cache for sandbox endpoint status.
 * TTL: 15 seconds — avoids 3 subprocess calls per /chat/send.
 */
const sandboxCache = new Map<string, { endpoint: string | null; ts: number }>()
const SANDBOX_CACHE_TTL = 15_000 // 15 seconds

/**
 * Get the sandbox agent endpoint for a user if their sandbox is running.
 * Results are cached in-memory to avoid subprocess overhead on every message.
 */
function getSandboxEndpoint(username: string): string | null {
  // Check cache first
  const cached = sandboxCache.get(username)
  if (cached && Date.now() - cached.ts < SANDBOX_CACHE_TTL) {
    return cached.endpoint
  }

  try {
    const containerName = `bapx-sandbox-${username}`
    const status = execSync(
      `docker ps --filter name=^/${containerName}$ --format '{{.Status}}'`,
      { encoding: 'utf-8', timeout: 5_000 }
    ).trim()
    if (!status) {
      sandboxCache.set(username, { endpoint: null, ts: Date.now() })
      return null
    }
    const portStr = execSync(
      `docker port ${containerName} 8765/tcp 2>/dev/null | head -1 | sed 's/.*://'`,
      { encoding: 'utf-8', timeout: 5_000 }
    ).trim()
    if (!portStr) {
      sandboxCache.set(username, { endpoint: null, ts: Date.now() })
      return null
    }
    // Verify agent is healthy (includes auth)
    const internalKey = process.env.BAPX_INTERNAL_API_KEY || ''
    const health = execSync(
      `curl -sf -H "Authorization: Bearer ${internalKey}" http://127.0.0.1:${portStr}/health`,
      { encoding: 'utf-8', timeout: 5_000 }
    ).trim()
    const endpoint = health ? `http://127.0.0.1:${portStr}` : null
    sandboxCache.set(username, { endpoint, ts: Date.now() })
    return endpoint
  } catch { /* sandbox not found or not responding — cache as null */
    sandboxCache.set(username, { endpoint: null, ts: Date.now() })
    return null
  }
}

export async function chatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // Get messages for a session
  app.get('/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as any
    const session: any = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(sessionId, request.userId)
    if (!session) return reply.status(404).send({ error: 'Session not found' })
    const messages = db.prepare('SELECT id, role, content, tool_calls, created_at FROM messages WHERE session_id = ? ORDER BY id').all(sessionId)
    return { session, messages }
  })

  // Create new session
  app.post('/new', async (request) => {
    const id = uuid()
    db.prepare('INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)').run(id, request.userId, 'New Chat')
    return { session: { id, title: 'New Chat' } }
  })

  // Send message and get response (streaming via SSE)
  app.post('/send', async (request, reply) => {
    const { message, sessionId } = request.body as any
    if (!message) return reply.status(400).send({ error: 'Message is required' })
    if (typeof message !== 'string' || message.trim().length === 0) {
      return reply.status(400).send({ error: 'Message must be a non-empty string' })
    }
    if (message.length > 4000) {
      return reply.status(400).send({ error: 'Message too long (max 4000 characters)' })
    }

    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    if (!user.api_key) return reply.status(400).send({ error: 'Please configure your API key in Settings first' })

    // Create or reuse session
    let sid = sessionId
    if (!sid) {
      sid = uuid()
      db.prepare('INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)').run(sid, request.userId, message.slice(0, 80))
    } else {
      // Verify session belongs to user
      const sess: any = db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?').get(sid, request.userId)
      if (!sess) return reply.status(404).send({ error: 'Session not found' })
    }

    // Save user message
    db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'user', message)

    // Load conversation history
    const history: any[] = db.prepare('SELECT role, content, tool_calls, tool_call_id, name FROM messages WHERE session_id = ? ORDER BY id').all(sid)

    // Build system prompt from user's SOUL.md profile
    const soulPrompt = user.soul_md
      ? `${user.soul_md}\n\nYour name is ${user.agent_name || 'BapX'}. You are ${user.name || user.username}'s personal autonomous AI agent. You have access to tools to help them. Be concise, proactive, and helpful. Use tools when appropriate. Build memory of their preferences over time.`
      : `You are ${user.agent_name || 'BapX'}, ${user.name || user.username}'s personal autonomous AI agent. You have access to tools. Be concise, proactive, and helpful.`

    const messages = [
      { role: 'system', content: soulPrompt },
      ...history.map((m: any) => {
        const msg: any = { role: m.role, content: m.content }
        if (m.tool_calls) {
          try { msg.tool_calls = JSON.parse(m.tool_calls) } catch { /* invalid JSON in stored tool_calls — treat as empty */ msg.tool_calls = [] }
        }
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        if (m.name) msg.name = m.name
        return msg
      })
    ]

    // Try to proxy through sandbox agent if available
    const sandboxEndpoint = getSandboxEndpoint(user.username)
    if (sandboxEndpoint) {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      try {
        const sseRes = await fetch(`${sandboxEndpoint}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BAPX_INTERNAL_API_KEY || ''}`,
          },
          body: JSON.stringify({
            message,
            session_id: sid,
            history: history.map((m: any) => ({ role: m.role, content: m.content })),
          }),
          signal: AbortSignal.timeout(120_000),
        })
        if (!sseRes.ok) {
          const errText = await sseRes.text()
          reply.raw.write(`data: ${JSON.stringify({ error: `Sandbox error: ${sseRes.status} — ${errText.slice(0, 200)}` })}\n\n`)
          reply.raw.end()
          return
        }
        const reader = sseRes.body!.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                fullContent += data.text
              }
              if (data.done) {
                if (fullContent) {
                  db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', fullContent)
                }
                reply.raw.write(`data: ${JSON.stringify({ done: true, sessionId: data.sessionId })}\n\n`)
                reply.raw.end()
                return
              }
              reply.raw.write(line + '\n')
            }
          }
        }
      } catch (err: any) {
        reply.raw.write(`data: ${JSON.stringify({ error: `Sandbox error: ${err.message}` })}\n\n`)
        reply.raw.end()
        return
      }
      reply.raw.end()
      return
    }

    // Fallback: direct LLM call
    // Set up SSE streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      // Call user's provider directly
      const provider = user.provider || 'openai'
      const apiKey = user.api_key
      const model = user.model || 'gpt-4o'

      let baseUrl: string
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        baseUrl = 'https://api.anthropic.com/v1/messages'
      } else if (provider === 'google') {
        headers['x-goog-api-key'] = apiKey
        baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent`
      } else {
        // OpenAI / OpenRouter / Custom
        baseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions'
          : provider === 'custom' ? (process.env.CUSTOM_BASE_URL || 'https://api.openai.com/v1')
          : 'https://api.openai.com/v1/chat/completions'
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const body = provider === 'anthropic' ? {
        model, messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content,
        max_tokens: 4096, stream: true
      } : {
        model, messages, stream: true, max_tokens: 4096
      }

      const abortController = new AbortController()
      // Handle client disconnect
      request.raw.on('close', () => abortController.abort())
      // Timeout after 120 seconds
      timeoutId = setTimeout(() => abortController.abort(), 120_000)

      const res = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body), signal: abortController.signal })
      if (!res.ok) {
        // Sanitize error — never expose raw API key or sensitive details in error messages
        const err = await res.text()
        const sanitizedErr = err.length > 1000 ? err.slice(0, 1000) + '... (truncated)' : err
        reply.raw.write(`data: ${JSON.stringify({ error: `API error: ${res.status} - ${sanitizedErr}` })}\n\n`)
        reply.raw.end()
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          if (provider === 'anthropic') {
            // Anthropic SSE format
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    fullContent += parsed.delta.text
                    reply.raw.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                  }
                } catch (parseErr) {
                  request.log.warn({ parseErr, partial: line.slice(0, 200) }, 'Failed to parse Anthropic SSE chunk')
                }
              }
            }
          } else {
            // OpenAI format SSE
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta
                  if (delta?.content) {
                    fullContent += delta.content
                    reply.raw.write(`data: ${JSON.stringify({ text: delta.content })}\n\n`)
                  }
                  if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                      reply.raw.write(`data: ${JSON.stringify({ tool_call: tc })}\n\n`)
                    }
                  }
                } catch (parseErr) {
                  request.log.warn({ parseErr, partial: line.slice(0, 200) }, 'Failed to parse OpenAI SSE chunk')
                }
              }
            }
          }
        }
      } catch (streamErr: any) {
        if (streamErr.name === 'AbortError') {
          reply.raw.write(`data: ${JSON.stringify({ done: true, sessionId: sid, aborted: true })}\n\n`)
        } else {
          reply.raw.write(`data: ${JSON.stringify({ error: `Stream error: ${streamErr.message}` })}\n\n`)
        }
        reply.raw.end()
        return
      }

      // Save assistant response
      if (fullContent) {
        db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', fullContent)
        db.prepare("UPDATE sessions SET title = CASE WHEN title = 'New Chat' AND length(?) > 0 THEN substr(?, 1, 80) ELSE title END, updated_at = datetime('now') WHERE id = ?")
          .run(message, message, sid)
      }

      clearTimeout(timeoutId)
      reply.raw.write(`data: ${JSON.stringify({ done: true, sessionId: sid })}\n\n`)
    } catch (err: any) {
      clearTimeout(timeoutId)
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    }
    reply.raw.end()
  })
}
