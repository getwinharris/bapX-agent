import { FastifyInstance } from 'fastify'
import { execSync } from 'child_process'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

/**
 * Build the sandbox image if it doesn't exist.
 * Returns true if build was needed, false if already present.
 */
function ensureImage(): boolean {
  try {
    execSync('docker image inspect bapx-agent:latest 2>/dev/null', { stdio: 'ignore' })
    return false // image exists
  } catch {
    // Build the image
    const buildDir = '/root/Dev/bapx'
    execSync(
      `docker build -t bapx-agent:latest -f ${buildDir}/docker/Dockerfile.agent ${buildDir}`,
      { stdio: 'inherit', timeout: 120_000 }
    )
    return true
  }
}

interface SandboxInfo {
  name: string
  status: string
  port: number
  created_at: string
}

/**
 * Start a named Docker sandbox container for a user.
 * Container name: bapx-sandbox-{username}
 * Returns the sandbox info or null if it already exists.
 */
function startSandbox(_userId: string, username: string, env: Record<string, string>): SandboxInfo | null {
  const containerName = `bapx-sandbox-${username}`

  // Check if already running
  try {
    const existing = execSync(
      `docker ps --filter name=^/${containerName}$ --format '{{.Status}}'`,
      { encoding: 'utf-8', timeout: 10_000 }
    ).trim()
    if (existing) {
      // Get assigned port
      const portStr = execSync(
        `docker port ${containerName} 8765/tcp 2>/dev/null | head -1 | sed 's/.*://'`,
        { encoding: 'utf-8', timeout: 5_000 }
      ).trim()
      const port = parseInt(portStr) || 0
      return { name: containerName, status: 'running', port, created_at: new Date().toISOString() }
    }
  } catch {
    // Not running — proceed to create
  }

  // Remove any stale container
  try {
    execSync(`docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore', timeout: 10_000 })
  } catch { /* best-effort cleanup – container may not exist */ }

  // Find next available port (8765 baseline, offset by user's index)
  const port = 8765 + Math.abs(hashCode(username) % 100)

  // Build env vars
  const envFlags = Object.entries(env)
    .filter(([, v]) => v)
    .map(([k, v]) => `-e ${k}=${shellEscape(v)}`)
    .join(' ')

  try {
    execSync(
      `docker run -d \
        --name ${containerName} \
        --restart no \
        --memory 512m \
        --memory-reservation 384m \
        --cpus 0.5 \
        -p ${port}:8765 \
        ${envFlags} \
        bapx-agent:latest`,
      { stdio: 'inherit', timeout: 30_000 }
    )
    return { name: containerName, status: 'running', port, created_at: new Date().toISOString() }
  } catch (err: any) {
    console.error('Failed to start sandbox:', err.message)
    return null
  }
}

function stopSandbox(containerName: string): boolean {
  try {
    execSync(`docker stop -t 5 ${containerName} 2>/dev/null && docker rm ${containerName} 2>/dev/null`, { stdio: 'ignore', timeout: 15_000 })
    return true
  } catch {
    return false
  }
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

function hashCode(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return Math.abs(hash)
}

export async function sandboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  // GET /api/sandbox — get user's sandbox status
  app.get('/status', async (request, reply) => {
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const containerName = `bapx-sandbox-${user.username}`
    try {
      const status = execSync(
        `docker ps --filter name=^/${containerName}$ --format '{{.Status}}'`,
        { encoding: 'utf-8', timeout: 5_000 }
      ).trim()

      const portStr = execSync(
        `docker port ${containerName} 8765/tcp 2>/dev/null | head -1 | sed 's/.*://'`,
        { encoding: 'utf-8', timeout: 5_000 }
      ).trim()

      return {
        name: containerName,
        status: status ? 'running' : 'stopped',
        port: parseInt(portStr) || null,
        health: null
      }
    } catch {
      return { name: containerName, status: 'stopped', port: null, health: null }
    }
  })

  // POST /api/sandbox/start — start user's sandbox container
  app.post('/start', async (request, reply) => {
    ensureImage()

    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const sandboxInfo = startSandbox(user.id, user.username, {
      BAPX_API_KEY: user.api_key || '',
      BAPX_PROVIDER: user.provider || 'openai',
      BAPX_MODEL: user.model || 'gpt-4o',
      BAPX_SOUL_MD: user.soul_md || '',
      BAPX_AGENT_NAME: user.agent_name || 'BapX',
      BAPX_USER_NAME: user.name || user.username,
      BAPX_CUSTOM_BASE_URL: process.env.CUSTOM_BASE_URL || '',
    })

    if (!sandboxInfo) {
      return reply.status(500).send({ error: 'Failed to start sandbox' })
    }

    return { success: true, sandbox: sandboxInfo }
  })

  // POST /api/sandbox/stop — stop user's sandbox container
  app.post('/stop', async (request, reply) => {
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const stopped = stopSandbox(`bapx-sandbox-${user.username}`)
    return { success: stopped, name: `bapx-sandbox-${user.username}` }
  })

  // POST /api/sandbox/health — ping the sandbox agent's health endpoint
  app.get('/health', async (request, reply) => {
    const user: any = db.prepare('SELECT id, username FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const containerName = `bapx-sandbox-${user.username}`
    try {
      const portStr = execSync(
        `docker port ${containerName} 8765/tcp 2>/dev/null | head -1 | sed 's/.*://'`,
        { encoding: 'utf-8', timeout: 5_000 }
      ).trim()
      if (!portStr) return { status: 'not_running' }

      const res = await fetch(`http://127.0.0.1:${portStr}/health`)
      const data = await res.json()
      return { status: 'running', health: data }
    } catch {
      return { status: 'not_running' }
    }
  })
}
