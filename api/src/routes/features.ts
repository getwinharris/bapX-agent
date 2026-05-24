import { FastifyInstance } from 'fastify'
import { v4 as uuid } from 'uuid'
import db from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

export async function projectRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', async (request) => {
    const projects = db.prepare(
      'SELECT id, name, description, master_instruction, pinned, created_at FROM projects WHERE user_id = ? ORDER BY pinned DESC, created_at DESC'
    ).all(request.userId)
    return { projects }
  })

  app.post('/', async (request, reply) => {
    const { name, description, master_instruction } = request.body as any
    if (!name) return reply.status(400).send({ error: 'Name is required' })
    const id = uuid()
    db.prepare(
      'INSERT INTO projects (id, user_id, name, description, master_instruction) VALUES (?, ?, ?, ?, ?)'
    ).run(id, request.userId, name, description || '', master_instruction || '')
    return { project: { id, name, description: description || '', master_instruction: master_instruction || '' } }
  })

  app.put('/:id', async (request, reply) => {
    const { id } = request.params as any
    const { name, description, master_instruction, pinned } = request.body as any
    const exists = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, request.userId)
    if (!exists) return reply.status(404).send({ error: 'Project not found' })
    const updates: string[] = []; const values: any[] = []
    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description) }
    if (master_instruction !== undefined) { updates.push('master_instruction = ?'); values.push(master_instruction) }
    if (pinned !== undefined) { updates.push('pinned = ?'); values.push(pinned ? 1 : 0) }
    if (updates.length > 0) {
      values.push(id)
      db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    }
    return { success: true }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as any
    const exists = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(id, request.userId)
    if (!exists) return reply.status(404).send({ error: 'Project not found' })
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
    return { success: true }
  })
}

export async function mcpRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', async (request) => {
    const mcps = db.prepare(
      'SELECT id, name, type, enabled, description, created_at FROM mcp_servers WHERE user_id = ? ORDER BY created_at'
    ).all(request.userId)
    return { mcps }
  })

  app.post('/', async (request, reply) => {
    const { name, type, config, description } = request.body as any
    if (!name) return reply.status(400).send({ error: 'Name is required' })
    const id = uuid()
    db.prepare(
      'INSERT INTO mcp_servers (id, user_id, name, type, config, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, request.userId, name, type || 'custom', JSON.stringify(config || {}), description || '')
    return { mcp: { id, name, type: type || 'custom', enabled: true } }
  })

  app.patch('/:id/toggle', async (request, reply) => {
    const { id } = request.params as any
    const mcp: any = db.prepare('SELECT id, enabled FROM mcp_servers WHERE id = ? AND user_id = ?').get(id, request.userId)
    if (!mcp) return reply.status(404).send({ error: 'MCP not found' })
    db.prepare('UPDATE mcp_servers SET enabled = ? WHERE id = ?').run(mcp.enabled ? 0 : 1, id)
    return { success: true, enabled: !mcp.enabled }
  })

  app.delete('/:id', async (request, _reply) => {
    const { id } = request.params as any
    db.prepare('DELETE FROM mcp_servers WHERE id = ? AND user_id = ?').run(id, request.userId)
    return { success: true }
  })
}

export async function automationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', async (request) => {
    const tasks = db.prepare(
      'SELECT id, name, prompt, schedule, output_method, enabled, last_run, created_at FROM scheduled_tasks WHERE user_id = ? ORDER BY created_at DESC'
    ).all(request.userId)
    return { tasks }
  })

  app.get('/history', async (request) => {
    const history = db.prepare(
      'SELECT id, task_id, status, started_at, completed_at, output_preview FROM task_history WHERE user_id = ? ORDER BY started_at DESC LIMIT 50'
    ).all(request.userId)
    return { history }
  })

  app.post('/', async (request, reply) => {
    const { name, prompt, schedule, output_method } = request.body as any
    if (!name || !prompt || !schedule) return reply.status(400).send({ error: 'Name, prompt, and schedule are required' })
    const id = uuid()
    db.prepare(
      'INSERT INTO scheduled_tasks (id, user_id, name, prompt, schedule, output_method) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, request.userId, name, prompt, schedule, output_method || 'file')
    return { task: { id, name, prompt, schedule, enabled: true, output_method: output_method || 'file' } }
  })

  app.patch('/:id/toggle', async (request, reply) => {
    const { id } = request.params as any
    const task: any = db.prepare('SELECT id, enabled FROM scheduled_tasks WHERE id = ? AND user_id = ?').get(id, request.userId)
    if (!task) return reply.status(404).send({ error: 'Task not found' })
    db.prepare('UPDATE scheduled_tasks SET enabled = ? WHERE id = ?').run(task.enabled ? 0 : 1, id)
    return { success: true, enabled: !task.enabled }
  })

  app.delete('/:id', async (request, _reply) => {
    const { id } = request.params as any
    db.prepare('DELETE FROM scheduled_tasks WHERE id = ? AND user_id = ?').run(id, request.userId)
    return { success: true }
  })
}

export async function skillRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', async (request) => {
    const skills = db.prepare(
      'SELECT id, name, description, prompt, enabled, created_at, updated_at FROM skills WHERE user_id = ? ORDER BY updated_at DESC'
    ).all(request.userId)
    return { skills }
  })

  app.post('/', async (request, reply) => {
    const { name, description, prompt } = request.body as any
    if (!name || !prompt) return reply.status(400).send({ error: 'Name and prompt are required' })
    const id = uuid()
    db.prepare(
      'INSERT INTO skills (id, user_id, name, description, prompt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, request.userId, name, description || '', prompt)
    return { skill: { id, name, description: description || '', prompt, enabled: true } }
  })

  app.put('/:id', async (request, reply) => {
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

  app.delete('/:id', async (request, _reply) => {
    const { id } = request.params as any
    db.prepare('DELETE FROM skills WHERE id = ? AND user_id = ?').run(id, request.userId)
    return { success: true }
  })
}
