import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

let _JWT_SECRET: string | null = null

/**
 * Get the JWT secret, validating it exists and meets length requirements.
 * Throws if the secret is missing or too short.
 */
export function requireJwtSecret(): string {
  if (_JWT_SECRET) return _JWT_SECRET
  const secret = process.env.JWT_SECRET || ''
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required. Set it to a strong random value.')
  }
  if (secret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters. Use: openssl rand -hex 32')
  }
  _JWT_SECRET = secret
  return _JWT_SECRET
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const auth = request.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'No token provided' })
  }
  try {
    const token = auth.slice(7)
    const payload = jwt.verify(token, requireJwtSecret()) as { userId: string }
    request.userId = payload.userId
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, requireJwtSecret(), { expiresIn: '7d' })
}
