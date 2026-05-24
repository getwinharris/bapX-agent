import { FastifyInstance } from 'fastify'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { ensureImage, startSandbox } from './sandbox.js'

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/profile', async (request, reply) => {
    type ProfileRow = {
      id: string; username: string; name: string; email: string;
      age: string; nature: string; agent_name: string; bio: string;
      soul_md: string; provider: string; model: string;
      oauth_provider: string;
      custom_providers: string;
      fallback_providers: string;
      pooled_credentials: string;
      skills_enabled: string;
    }
    const user = db.prepare(
      `SELECT id, username, name, email, age, nature, agent_name, bio, soul_md,
       provider, model, oauth_provider, custom_providers, fallback_providers,
       pooled_credentials, skills_enabled FROM users WHERE id = ?`
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
      model: user.model,
      oauth_provider: user.oauth_provider,
      custom_providers: safeJson(user.custom_providers, []),
      fallback_providers: safeJson(user.fallback_providers, []),
      pooled_credentials: safeJson(user.pooled_credentials, []),
      skills_enabled: safeJson(user.skills_enabled, []),
    }
  })

  app.put('/api-key', async (request, reply) => {
    const { provider, key, model } = request.body as { provider?: string; key?: string; model?: string }
    const updates: string[] = []
    const values: (string | number)[] = []

    if (key !== undefined && key !== null && key !== '') {
      if (typeof key !== 'string' || key.length < 8) {
        return reply.status(400).send({ error: 'API key must be at least 8 characters' })
      }
      if (!key.startsWith('••••')) {
        updates.push('api_key = ?')
        values.push(key)
      }
    }

    if (provider) {
      const validProviders = ['openrouter','openai','anthropic','google','deepseek','groq','together','mistral','cohere','perplexity','nvidia-nim','xai','huggingface','kimi','minimax','zai','xiaomi','stepfun','arcee','gmi-cloud','ollama-cloud','lm-studio','aws-bedrock','azure-foundry','qwen-oauth','tencent','custom']
      if (!validProviders.includes(provider)) {
        return reply.status(400).send({ error: `Invalid provider` })
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

    // Auto-start sandbox if API key was configured
    if (key !== undefined && key !== null && key !== '' && !key.startsWith('••••')) {
      const user: any = db.prepare('SELECT id, username, name, provider, model, agent_name, soul_md FROM users WHERE id = ?').get(request.userId)
      if (user) {
        setImmediate(() => {
          try {
            ensureImage()
            startSandbox(user.id, user.username, {
              BAPX_API_KEY: key,
              BAPX_PROVIDER: user.provider || 'openai',
              BAPX_MODEL: user.model || 'gpt-4o',
              BAPX_SOUL_MD: user.soul_md || '',
              BAPX_AGENT_NAME: user.agent_name || 'BapX',
              BAPX_USER_NAME: user.name || user.username,
              BAPX_INTERNAL_API_KEY: process.env.BAPX_INTERNAL_API_KEY || '',
            })
          } catch { /* sandbox auto-start is best-effort */ }
        })
      }
    }

    return { success: true }
  })

  // OAuth login — store OAuth provider credentials with refresh + expiry
  app.post('/oauth-login', async (request, reply) => {
    const { provider, token, refreshToken, expiresAt } = request.body as {
      provider?: string; token?: string; refreshToken?: string; expiresAt?: string
    }
    if (!provider || !token) {
      return reply.status(400).send({ error: 'OAuth provider and token are required' })
    }
    const validOAuthProviders = ['openai-codex', 'anthropic-oauth', 'xai-oauth', 'google-gemini-oauth', 'nous', 'minimax-oauth']
    if (!validOAuthProviders.includes(provider)) {
      return reply.status(400).send({ error: `Invalid OAuth provider` })
    }
    db.prepare(
      `UPDATE users SET oauth_provider = ?, oauth_token = ?, oauth_refresh_token = ?,
       oauth_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(provider, token, refreshToken || '', expiresAt || '', request.userId)
    return { success: true, provider }
  })

  // Save custom providers (JSON array)
  app.put('/custom-providers', async (request, reply) => {
    const { providers } = request.body as { providers?: any[] }
    if (!providers || !Array.isArray(providers)) {
      return reply.status(400).send({ error: 'providers must be an array' })
    }
    db.prepare("UPDATE users SET custom_providers = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(providers), request.userId)
    return { success: true, providers }
  })

  // Save fallback providers (JSON array)
  app.put('/fallback-providers', async (request, reply) => {
    const { providers } = request.body as { providers?: any[] }
    if (!providers || !Array.isArray(providers)) {
      return reply.status(400).send({ error: 'providers must be an array' })
    }
    db.prepare("UPDATE users SET fallback_providers = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(providers), request.userId)
    return { success: true, fallback_providers: providers }
  })

  // Save pooled credentials (JSON array)
  app.put('/pooled-credentials', async (request, reply) => {
    const { credentials } = request.body as { credentials?: any[] }
    if (!credentials || !Array.isArray(credentials)) {
      return reply.status(400).send({ error: 'credentials must be an array' })
    }
    db.prepare("UPDATE users SET pooled_credentials = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(credentials), request.userId)
    return { success: true, pooled_credentials: credentials }
  })

  // Save skills enabled list
  app.put('/skills', async (request, reply) => {
    const { skills } = request.body as { skills?: string[] }
    if (!skills || !Array.isArray(skills)) {
      return reply.status(400).send({ error: 'skills must be an array' })
    }
    db.prepare("UPDATE users SET skills_enabled = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(skills), request.userId)
    return { success: true, skills }
  })

  // Get user's own skills (user-created, not pre-loaded)
  app.get('/skills', async (request) => {
    const skills = db.prepare(
      'SELECT id, name, description, prompt, enabled, created_at, updated_at FROM skills WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(request.userId)
    return { skills }
  })

  // Create a new skill (user-authored)
  app.post('/skills', async (request, reply) => {
    const { name, description, prompt } = request.body as { name?: string; description?: string; prompt?: string }
    if (!name || !prompt) return reply.status(400).send({ error: 'Name and prompt are required' })
    const { v4: uuid } = await import('uuid')
    const id = uuid()
    db.prepare(
      'INSERT INTO skills (id, user_id, name, description, prompt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, request.userId, name, description || '', prompt)
    return { skill: { id, name, description: description || '', prompt, enabled: true } }
  })

  // Update a skill
  app.put('/skills/:id', async (request, reply) => {
    const { id } = request.params as any
    const { name, description, prompt, enabled } = request.body as any
    const existing: any = db.prepare('SELECT id FROM skills WHERE id = ? AND user_id = ?').get(id, request.userId)
    if (!existing) return reply.status(404).send({ error: 'Skill not found' })
    const updates: string[] = []; const values: any[] = []
    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (prompt !== undefined) { updates.push('prompt = ?'); values.push(prompt) }
    if (enabled !== undefined) { updates.push('enabled = ?'); values.push(enabled ? 1 : 0) }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }
    return { success: true }
  })

  // Delete a skill
  app.delete('/skills/:id', async (request, _reply) => {
    const { id } = request.params as any
    db.prepare('DELETE FROM skills WHERE id = ? AND user_id = ?').run(id, request.userId)
    return { success: true }
  })

  // Get user memory entries
  app.get('/memory', async (request) => {
    const memory = db.prepare(
      'SELECT id, key, value, category, created_at, updated_at FROM memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100'
    ).all(request.userId)
    return { memory }
  })

  // Save a memory entry
  app.post('/memory', async (request, reply) => {
    const { key, value, category } = request.body as { key?: string; value?: string; category?: string }
    if (!key || !value) return reply.status(400).send({ error: 'Key and value are required' })
    // Upsert: update if key exists for this user, insert otherwise
    const existing: any = db.prepare('SELECT id FROM memory WHERE user_id = ? AND key = ?').get(request.userId, key)
    if (existing) {
      db.prepare("UPDATE memory SET value = ?, category = ?, updated_at = datetime('now') WHERE id = ?")
        .run(value, category || '', existing.id)
    } else {
      const { v4: uuid } = await import('uuid')
      db.prepare('INSERT INTO memory (id, user_id, key, value, category) VALUES (?, ?, ?, ?, ?)')
        .run(uuid(), request.userId, key, value, category || '')
    }
    return { success: true }
  })

  // Delete a memory entry
  app.delete('/memory/:id', async (request, _reply) => {
    const { id } = request.params as any
    db.prepare('DELETE FROM memory WHERE id = ? AND user_id = ?').run(id, request.userId)
    return { success: true }
  })

  app.get('/sessions', async (request) => {
    const sessions = db.prepare(
      'SELECT id, title, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50'
    ).all(request.userId)
    return { sessions }
  })
}

function safeJson(str: string, fallback: any) {
  try { return JSON.parse(str) } catch { /* str may be empty string or unparseable — use fallback */ return fallback }
}
