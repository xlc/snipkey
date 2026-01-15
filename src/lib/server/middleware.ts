import { env } from 'cloudflare:workers'
import { getDb } from '@shared/db/db'
import { createMiddleware } from '@tanstack/react-start'
import * as auth from './auth'
import { getSessionId } from './context'
import type { AuthenticatedContext, MiddlewareContext } from './middleware-types'

/**
 * Security middleware that adds security headers to all responses
 *
 * This middleware adds:
 * - Content-Security-Policy: Restricts resource sources
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Referrer-Policy: Controls referrer information leakage
 * - Permissions-Policy: Restricts browser features
 */
export const securityMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next()

  // Add security headers
  result.response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
  )
  result.response.headers.set('X-Frame-Options', 'DENY')
  result.response.headers.set('X-Content-Type-Options', 'nosniff')
  result.response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  result.response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  return result
})

/**
 * Authentication middleware for TanStack Start server functions
 *
 * This middleware:
 * 1. Gets env from Cloudflare Workers bindings
 * 2. Extracts session ID from request cookies
 * 3. Validates session against database
 * 4. Enriches context with user data and env
 * 5. Returns null for user if not authenticated
 *
 * Use this for endpoints where authentication is optional
 */
export const authMiddleware = createMiddleware().server(async ({ request, next }) => {
  const db = getDb(env)
  const sessionId = getSessionId(request.headers)
  const userId = sessionId ? await auth.validateSession(db, sessionId) : null

  // Always use the same return structure to avoid type inference issues
  return next({
    context: {
      env,
      user: userId ? { id: userId } : null,
      sessionId: sessionId ?? undefined,
    } satisfies MiddlewareContext,
  })
})

/**
 * Require authentication - throws if not logged in
 * Use this for endpoints that must have a valid user
 */
export const requireAuthMiddleware = createMiddleware().server(async ({ request, next }) => {
  const db = getDb(env)
  const sessionId = getSessionId(request.headers)

  if (!sessionId) {
    throw new Error('AUTH_REQUIRED: No session cookie found')
  }

  const userId = await auth.validateSession(db, sessionId)
  if (!userId) {
    throw new Error('AUTH_REQUIRED: Invalid or expired session')
  }

  return next({
    context: {
      env,
      user: { id: userId },
      sessionId,
    } satisfies AuthenticatedContext,
  })
})

/**
 * Environment middleware - adds env to context without authentication
 * Use this for public endpoints that need access to Workers environment (DB, config)
 */
export const envMiddleware = createMiddleware().server(async ({ next }) => {
  return next({
    context: {
      env,
      user: null,
      sessionId: undefined,
    } satisfies MiddlewareContext,
  })
})
