import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'bapx-dev-secret-change-in-production'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'No token provided' })
  }
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    request.userId = payload.userId
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}
