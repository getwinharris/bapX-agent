import Fastify from 'fastify'
import cors from '@fastify/cors'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { chatRoutes } from './routes/chat.js'

const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

const app = Fastify({ logger: true })

// Plugins
await app.register(cors, { origin: true, credentials: true })

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(userRoutes, { prefix: '/api/user' })
await app.register(chatRoutes, { prefix: '/api/chat' })

// Health check
app.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }))

// Start
try {
  await app.listen({ port: PORT, host: HOST })
  console.log(`🚀 bapX API running on http://${HOST}:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

export default app
