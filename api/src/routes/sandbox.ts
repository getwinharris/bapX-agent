import { FastifyInstance } from 'fastify'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

/** OpenSandbox server URL — configured via env or defaults to localhost:8080 */
const OPEN_SANDBOX_URL = process.env.OPEN_SANDBOX_URL || 'http://127.0.0.1:8080'

/**
 * Ensure the agent image exists (best-effort pull via OpenSandbox).
 * Called auto-start when a user configures their API key.
 */
export async function ensureImage() {
  try {
    await fetch(`${OPEN_SANDBOX_URL}/v1/images/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: 'bapx-agent:latest' }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    // image pull is best-effort
  }
}

/**
 * Start a sandbox for a user (called on API key save).
 * Talks to OpenSandbox server via REST.
 */
export async function startSandbox(_userId: string, _username: string, env: Record<string, string>) {
  try {
    await fetch(`${OPEN_SANDBOX_URL}/v1/sandboxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: { uri: 'bapx-agent:latest' },
        timeout: 86400,
        resourceLimits: { cpu: '1', memory: '2Gi' },
        env,
        metadata: { name: _username },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch {
    // sandbox auto-start is best-effort
  }
}

export async function sandboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/status', async (request, reply) => {
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    try {
      const res = await fetch(`${OPEN_SANDBOX_URL}/v1/sandboxes?metadata.name=${user.username}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) return { name: `bapx-${user.username}`, status: 'stopped' }
      const data: any = await res.json()
      const sandbox = Array.isArray(data) ? data[0] : data
      if (!sandbox) return { name: `bapx-${user.username}`, status: 'stopped' }
      return {
        name: `bapx-${user.username}`,
        status: sandbox.status?.state || 'stopped',
        id: sandbox.id,
        expiresAt: sandbox.expiresAt,
      }
    } catch {
      return { name: `bapx-${user.username}`, status: 'unknown', error: 'Cannot reach sandbox server' }
    }
  })

  app.post('/start', async (request, reply) => {
    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    if (!user.api_key) return reply.status(400).send({ error: 'API key required to start sandbox' })

    try {
      const res = await fetch(`${OPEN_SANDBOX_URL}/v1/sandboxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: { uri: 'bapx-agent:latest' },
          timeout: 86400,
          resourceLimits: { cpu: '1', memory: '2Gi' },
          env: {
            BAPX_API_KEY: user.api_key,
            BAPX_PROVIDER: user.provider || 'openai',
            BAPX_MODEL: user.model || 'gpt-4o',
            BAPX_SOUL_MD: user.soul_md || '',
            BAPX_AGENT_NAME: user.agent_name || 'BapX',
            BAPX_USER_NAME: user.name || user.username,
          },
          metadata: { name: user.username },
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        return reply.status(500).send({ error: `Sandbox creation failed: ${err.slice(0, 200)}` })
      }
      const data: any = await res.json()
      return { success: true, sandbox: { id: data.id, status: data.status?.state || 'pending' } }
    } catch (err: any) {
      return reply.status(500).send({ error: `Sandbox error: ${err.message}` })
    }
  })

  app.post('/stop', async (request, reply) => {
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    try {
      // Find the sandbox by username metadata
      const listRes = await fetch(`${OPEN_SANDBOX_URL}/v1/sandboxes?metadata.name=${user.username}`)
      if (listRes.ok) {
        const list: any = await listRes.json()
        const sandboxes = Array.isArray(list) ? list : [list]
        for (const sb of sandboxes) {
          if (sb.id) {
            await fetch(`${OPEN_SANDBOX_URL}/v1/sandboxes/${sb.id}`, { method: 'DELETE' })
          }
        }
      }
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to stop sandbox' }
    }
  })

  app.get('/health', async () => {
    try {
      const res = await fetch(`${OPEN_SANDBOX_URL}/health`)
      const data = await res.json()
      return { status: 'running', server: data }
    } catch {
      return { status: 'not_running' }
    }
  })
}
