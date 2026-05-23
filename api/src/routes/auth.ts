import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { signToken } from '../middleware/auth.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/signup', async (request, reply) => {
    const { email, password, name } = request.body as any
    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'Email, password, and name are required' })
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' })
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' })
    }
    const id = uuid()
    const hash = await bcrypt.hash(password, 10)
    db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(id, name, email, hash)
    const token = signToken(id)
    return { token, user: { id, name, email, provider: 'openai', model: '' } }
  })

  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as any
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' })
    }
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }
    const token = signToken(user.id)
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, provider: user.provider, model: user.model }
    }
  })
}
