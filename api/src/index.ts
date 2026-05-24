import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { chatRoutes } from './routes/chat.js'
import { sandboxRoutes } from './routes/sandbox.js'
import { requireJwtSecret } from './middleware/auth.js'

const PORT = parseInt(process.env.PORT || '3001', 10)
const HOST = process.env.HOST || '0.0.0.0'

// Validate JWT_SECRET at startup (fail fast)
requireJwtSecret()

const app = Fastify({
  logger: {
    redact: {
      paths: ['req.headers.authorization', 'req.body.api_key', 'req.body.password', 'req.body.apiKey'],
      censor: '***REDACTED***',
    },
  },
})

// Rate limiting
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
})

// Plugins
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
await app.register(cors, { origin: CORS_ORIGIN, credentials: true })

// Routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(userRoutes, { prefix: '/api/user' })
await app.register(chatRoutes, { prefix: '/api/chat' })
await app.register(sandboxRoutes, { prefix: '/api/sandbox' })

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
