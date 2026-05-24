import { FastifyInstance } from 'fastify'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/profile', async (request, reply) => {
    type ProfileRow = {
      id: string; username: string; name: string; email: string;
      age: string; nature: string; agent_name: string; bio: string;
      soul_md: string; provider: string; model: string;
    }
    const user = db.prepare(
      'SELECT id, username, name, email, age, nature, agent_name, bio, soul_md, provider, model FROM users WHERE id = ?'
    ).get(request.userId) as ProfileRow | undefined
    if (!user) return reply.status(404).send({ error: 'User not found' })
    // Fetch API key separately to avoid accidental logging exposure
    type KeyRow = { api_key: string }
    const keyRow = db.prepare('SELECT api_key FROM users WHERE id = ?').get(request.userId) as KeyRow | undefined
    return {
      id: user.id, username: user.username, name: user.name,
      email: user.email, age: user.age, nature: user.nature,
      agent_name: user.agent_name, bio: user.bio,
      soul_md: user.soul_md,
      provider: user.provider,
      api_key: keyRow?.api_key ? '••••' + keyRow.api_key.slice(-4) : '',
      model: user.model
    }
  })

  app.put('/api-key', async (request, reply) => {
    const { provider, key, model } = request.body as { provider?: string; key?: string; model?: string }
    const updates: string[] = []
    const values: (string | number)[] = []

    // Only update the key if a new one is provided (not masked)
    if (key !== undefined && key !== null && key !== '') {
      if (typeof key !== 'string' || key.length < 8) {
        return reply.status(400).send({ error: 'API key must be at least 8 characters' })
      }
      // If it looks like a masked key, skip the update
      if (!key.startsWith('••••')) {
        updates.push('api_key = ?')
        values.push(key)
      }
    }

    if (provider) {
      const validProviders = ['openai', 'anthropic', 'google', 'openrouter', 'custom']
      if (!validProviders.includes(provider)) {
        return reply.status(400).send({ error: `Provider must be one of: ${validProviders.join(', ')}` })
      }
      updates.push('provider = ?')
      values.push(provider)
    }

    if (model !== undefined) {
      updates.push('model = ?')
      values.push(model)
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'Nothing to update' })
    }

    updates.push("updated_at = datetime('now')")
    values.push(request.userId as string)

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    return { success: true }
  })

  app.get('/sessions', async (request) => {
    const sessions = db.prepare(
      'SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50'
    ).all(request.userId)
    return { sessions }
  })
}
