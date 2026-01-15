/**
 * Type definitions for middleware context
 */

export interface MiddlewareContext {
  env: CloudflareEnv
  user: { id: string } | null
  sessionId?: string
}

/**
 * Context type for routes that require authentication
 * User is guaranteed to be non-null
 */
export interface AuthenticatedContext {
  env: CloudflareEnv
  user: { id: string }
  sessionId: string
}
