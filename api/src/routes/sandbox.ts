import { FastifyInstance } from 'fastify'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

/** Cache: has the Docker image been confirmed present? */
let _imageChecked = false

/**
 * Build the sandbox image if it doesn't exist.
 * Cached after first check to avoid repeated `docker image inspect` calls.
 * Returns true if build was needed, false if already present.
 */
export function ensureImage(): boolean {
  if (_imageChecked) return false
  try {
    execSync('docker image inspect bapx-agent:latest 2>/dev/null', { stdio: 'ignore' })
    _imageChecked = true
    return false // image exists
  } catch { /* image not found — proceed to build */
    // Image not found — build it
    const buildDir = process.env.BAPX_BUILD_DIR || '/root/Dev/bapx'
    execSync(
      `docker build -t bapx-agent:latest -f ${buildDir}/docker/Dockerfile.agent ${buildDir}`,
      { stdio: 'inherit', timeout: 120_000 }
    )
    _imageChecked = true
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
export function startSandbox(_userId: string, username: string, env: Record<string, string>): SandboxInfo | null {
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
  } catch { /* not running or error — proceed to create */
    // Not running — proceed to create
  }

  // Remove any stale container
  try {
    execSync(`docker rm -f ${containerName} 2>/dev/null`, { stdio: 'ignore', timeout: 10_000 })
  } catch { /* best-effort cleanup – container may not exist */ }

  // Find next available port (8765 baseline, offset by user's index)
  const basePort = 8765 + Math.abs(hashCode(username) % 100)
  const port = findAvailablePort(basePort)

  // Write env vars to a temp file to avoid shell injection via -e flags
  let envFilePath: string | null = null
  try {
    const tmpDir = mkdtempSync(join(tmpdir(), 'bapx-sandbox-'))
    envFilePath = join(tmpDir, 'env.list')
    const envLines = Object.entries(env)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v.replace(/\n/g, '\\n')}`)
    writeFileSync(envFilePath, envLines.join('\n') + '\n', 'utf-8')

    execSync(
      `docker run -d \
        --name ${containerName} \
        --restart no \
        --memory 512m \
        --memory-reservation 384m \
        --cpus 0.5 \
        -p ${port}:8765 \
        --env-file ${envFilePath} \
        bapx-agent:latest`,
      { stdio: 'inherit', timeout: 30_000 }
    )
    return { name: containerName, status: 'running', port, created_at: new Date().toISOString() }
  } catch (err: any) {
    console.error('Failed to start sandbox:', err.message)
    return null
  } finally {
    if (envFilePath) {
      try { unlinkSync(envFilePath) } catch { /* temp file cleanup */ }
      try { rmSync(join(envFilePath!, '..'), { recursive: true, force: true }) } catch { /* dir cleanup */ }
    }
  }
}

/**
 * Find an available host port, trying the preferred port first
 * then scanning upwards. Uses ss (socket statistics) — instant, no Docker.
 */
function findAvailablePort(preferred: number): number {
  for (let offset = 0; offset < 20; offset++) {
    const port = preferred + offset
    try {
      execSync(`ss -tln src :${port} 2>/dev/null | grep -q .`, { stdio: 'ignore', timeout: 2_000 })
      // If the command succeeds, ss found something listening on that port
    } catch { /* port not in use — it's free */
      // Command failed (grep found nothing or ss errored) — port is free
      return port
    }
  }
  // Last resort — let Docker pick the port
  return preferred
}

function stopSandbox(containerName: string): boolean {
  try {
    execSync(`docker stop -t 5 ${containerName} 2>/dev/null && docker rm ${containerName} 2>/dev/null`, { stdio: 'ignore', timeout: 15_000 })
    return true
  } catch { /* container may not exist — treat as success */
    return false
  }
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
    } catch { /* docker command or container not running */
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
      BAPX_INTERNAL_API_KEY: process.env.BAPX_INTERNAL_API_KEY || '',
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

      const res = await fetch(`http://127.0.0.1:${portStr}/health`, {
        headers: { 'Authorization': `Bearer ${process.env.BAPX_INTERNAL_API_KEY || ''}` }
      })
      const data = await res.json()
      return { status: 'running', health: data }
    } catch { /* container not running or health check failed */
      return { status: 'not_running' }
    }
  })
}
