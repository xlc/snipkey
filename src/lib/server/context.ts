import { getDb } from '@shared/db/db'
import type { MiddlewareContext } from './middleware-types'

// Get session ID from request headers
export function getSessionId(headers: Headers): string | undefined {
  const cookies = headers.get('cookie') ?? ''
  // Use stricter regex to avoid matching substrings of other cookies
  const sessionMatch = cookies.match(/(?:^|; )session=([^;]+)/)
  return sessionMatch?.[1]
}

// Create session cookie header
export function createSessionCookie(sessionId: string, maxAge: number): string {
  return `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

// Create cleared session cookie header
export function createClearedSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

/**
 * Helper to extract middleware context from TanStack Start server function context
 * This avoids using 'as any' casts by providing a type-safe way to access the context
 *
 * Note: This function requires that the context exists and contains env.
 * It should only be called on server functions that use middleware.
 */
export function getServerFnContext(ctx: { context?: MiddlewareContext }): MiddlewareContext {
  if (!ctx.context) {
    throw new Error('Server function context not found. Did you forget to add middleware?')
  }
  return ctx.context
}

/**
 * Get database instance from env (which should come from middleware context)
 */
export function getDbFromEnv(env: CloudflareEnv) {
  return getDb(env)
}
