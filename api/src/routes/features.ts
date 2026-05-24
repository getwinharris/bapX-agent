import { FastifyInstance } from 'fastify'
import { v4 as uuid } from 'uuid'
import fs from 'fs'
import path from 'path'
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

const HERMES_SKILLS_PATH = '/usr/local/lib/hermes-agent/skills'

interface HermesSkill {
  name: string
  description: string
  category: string
}

/** Parse the first line of a SKILL.md to extract name and description from YAML frontmatter */
function parseSkillMd(filePath: string): { name: string; description: string } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    let name = '', description = ''
    let inFrontmatter = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === '---') {
        if (!inFrontmatter) { inFrontmatter = true; continue }
        else break
      }
      if (!inFrontmatter) break
      if (trimmed.startsWith('name:')) {
        name = trimmed.slice(5).trim().replace(/^['"]|['"]$/g, '')
      }
      if (trimmed.startsWith('description:')) {
        description = trimmed.slice(12).trim().replace(/^['"]|['"]$/g, '')
      }
    }
    return { name, description }
  } catch {
    return { name: '', description: '' }
  }
}

/** Read Hermes skills from the filesystem — returns a flat list */
export async function hermesSkillRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', async () => {
    const skills: HermesSkill[] = []
    if (!fs.existsSync(HERMES_SKILLS_PATH)) return { skills }

    const categories = fs.readdirSync(HERMES_SKILLS_PATH, { withFileTypes: true })
    for (const cat of categories) {
      if (!cat.isDirectory()) continue
      const catPath = path.join(HERMES_SKILLS_PATH, cat.name)
      const entries = fs.readdirSync(catPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillDir = path.join(catPath, entry.name)
        const skillMdPath = path.join(skillDir, 'SKILL.md')
        if (fs.existsSync(skillMdPath)) {
          const { name, description } = parseSkillMd(skillMdPath)
          skills.push({
            name: name || entry.name,
            description: description || '',
            category: cat.name,
          })
        }
      }
    }

    // Sort alphabetically by name
    skills.sort((a, b) => a.name.localeCompare(b.name))
    return { skills }
  })
}

/** List all available Hermes skills from the filesystem — mounted at GET /skills */
export async function skillsListRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/skills', async () => {
    const skills: HermesSkill[] = []
    if (!fs.existsSync(HERMES_SKILLS_PATH)) return { skills }

    const categories = fs.readdirSync(HERMES_SKILLS_PATH, { withFileTypes: true })
    for (const cat of categories) {
      if (!cat.isDirectory()) continue
      const catPath = path.join(HERMES_SKILLS_PATH, cat.name)
      const entries = fs.readdirSync(catPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillDir = path.join(catPath, entry.name)
        const skillMdPath = path.join(skillDir, 'SKILL.md')
        if (fs.existsSync(skillMdPath)) {
          const { name, description } = parseSkillMd(skillMdPath)
          skills.push({
            name: name || entry.name,
            description: description || '',
            category: cat.name,
          })
        }
      }
    }

    skills.sort((a, b) => a.name.localeCompare(b.name))
    return { skills }
  })
}

/** Save user's enabled skills list — mounted at PUT /user/skills */
export async function userSkillsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.put('/user/skills', async (request, reply) => {
    const { skills } = request.body as { skills?: string[] }
    if (!Array.isArray(skills)) {
      return reply.status(400).send({ error: 'skills must be a string array' })
    }
    const skillsJson = JSON.stringify(skills)
    db.prepare("UPDATE users SET skills_enabled = ?, updated_at = datetime('now') WHERE id = ?")
      .run(skillsJson, request.userId)
    return { success: true, skills }
  })
}
