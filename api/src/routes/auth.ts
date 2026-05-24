import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { signToken } from '../middleware/auth.js'

function generateSoul(username: string, name: string, age: string, nature: string, agentName: string, bio: string): string {
  return `# SOUL.md — ${name}'s Agent Configuration

## Who You Are
**Name:** ${name}
**Username:** ${username}
${age ? `**Age:** ${age}` : ''}
${nature ? `**Nature of Work/Study:** ${nature}` : ''}
${bio ? `**Self-Description:** ${bio}` : ''}

## Your Agent
Your agent is named **${agentName}**. ${agentName} works for you autonomously — executing tasks, managing memory, and building skills over time.

## Core Directives
- You bring your own API key — your agent uses YOUR models, not shared infrastructure.
- Your agent builds persistent memory of your preferences, projects, and workflows.
- Your skills library grows with you — every solved problem becomes reusable knowledge.
- Your data is isolated in your own sandbox. No other user can access it.
`
}

export async function authRoutes(app: FastifyInstance) {
  // Stricter rate limiting for auth endpoints: 10 requests per minute
  const authRateLimit = { max: 10, timeWindow: '1 minute' }

  app.post('/signup', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const {
      username, name, email, password,
      age, nature, agent_name, bio
    } = request.body as {
      username?: string; name?: string; email?: string; password?: string;
      age?: string; nature?: string; agent_name?: string; bio?: string;
    }

    if (!username || !name || !email || !password) {
      return reply.status(400).send({ error: 'Username, name, email, and password are required' })
    }
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
      return reply.status(400).send({ error: 'Username must be 3-30 characters: letters, numbers, hyphens, underscores only' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' })
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' })
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return reply.status(400).send({ error: 'Password must contain uppercase, lowercase, and a number' })
    }

    // Check username uniqueness
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existingUser) {
      return reply.status(409).send({ error: 'Username already taken. Please choose another.' })
    }

    // Check email uniqueness
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingEmail) {
      return reply.status(409).send({ error: 'Email already registered' })
    }

    const id = uuid()
    const hash = await bcrypt.hash(password, 10)
    const agentName = agent_name || 'BapX'
    const soul = generateSoul(username, name, age || '', nature || '', agentName, bio || '')

    db.prepare(`INSERT INTO users (id, username, name, email, password_hash, age, nature, agent_name, bio, soul_md)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, username, name, email, hash, age || '', nature || '', agentName, bio || '', soul)

    const token = signToken(id)
    return {
      token,
      user: {
        id, username, name, email,
        age: age || '', nature: nature || '',
        agent_name: agentName, bio: bio || '',
        provider: 'openai', model: ''
      }
    }
  })

  app.post('/login', { config: { rateLimit: authRateLimit } }, async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string }
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' })
    }
    type UserRow = {
      id: string; username: string; name: string; email: string;
      password_hash: string; age: string; nature: string;
      agent_name: string; bio: string; provider: string; model: string;
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
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
      user: {
        id: user.id, username: user.username, name: user.name,
        email: user.email, age: user.age, nature: user.nature,
        agent_name: user.agent_name, bio: user.bio,
        provider: user.provider, model: user.model
      }
    }
  })
}
