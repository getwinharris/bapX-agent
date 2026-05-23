import { FastifyInstance } from 'fastify'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

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

    // Build OpenAI-format messages array
    const messages = [
      { role: 'system', content: 'You are bapX, an autonomous AI agent. You have access to tools to help users. Use them when appropriate. Be concise and helpful.' },
      ...history.map((m: any) => {
        const msg: any = { role: m.role, content: m.content }
        if (m.tool_calls) msg.tool_calls = JSON.parse(m.tool_calls)
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        if (m.name) msg.name = m.name
        return msg
      })
    ]

    // Set up SSE streaming
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    try {
      // Call user's provider directly
      const provider = user.provider || 'openai'
      const apiKey = user.api_key
      const model = user.model || 'gpt-4o'

      let baseUrl: string
      let headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        baseUrl = 'https://api.anthropic.com/v1/messages'
      } else if (provider === 'google') {
        baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`
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

      const res = await fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.text()
        reply.raw.write(`data: ${JSON.stringify({ error: `API error: ${res.status} - ${err}` })}\n\n`)
        reply.raw.end()
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''

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
              } catch {}
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
              } catch {}
            }
          }
        }
      }

      // Save assistant response
      if (fullContent) {
        db.prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', fullContent)
        db.prepare('UPDATE sessions SET title = CASE WHEN title = \'New Chat\' AND length(?) > 0 THEN substr(?, 1, 80) ELSE title END, updated_at = datetime(\'now\') WHERE id = ?')
          .run(message, message, sid)
      }

      reply.raw.write(`data: ${JSON.stringify({ done: true, sessionId: sid })}\n\n`)
    } catch (err: any) {
      reply.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    }
    reply.raw.end()
  })
}
