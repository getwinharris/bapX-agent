import { FastifyInstance } from 'fastify'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/profile', async (request, reply) => {
    const user: any = db.prepare('SELECT id, name, email, provider, api_key, model FROM users WHERE id = ?').get(request.userId)
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return { id: user.id, name: user.name, email: user.email, provider: user.provider, api_key: user.api_key ? '••••' + user.api_key.slice(-4) : '', model: user.model }
  })

  app.put('/api-key', async (request, reply) => {
    const { provider, key, model } = request.body as any
    if (!key) return reply.status(400).send({ error: 'API key is required' })
    db.prepare('UPDATE users SET provider = ?, api_key = ?, model = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(provider || 'openai', key, model || '', request.userId)
    return { success: true }
  })

  app.get('/sessions', async (request) => {
    const sessions = db.prepare('SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50')
      .all(request.userId)
    return { sessions }
  })
}
