import { createMiddleware } from '@tanstack/start'
import * as auth from './auth'
import { getDbFromEnv, getSessionId } from './context'
import type { MiddlewareContext } from './middleware-types'

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
export const securityMiddleware = createMiddleware().server(async ({ request }) => {
	const response = await request.next()

	// Add security headers
	response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';")
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

	return response
})

/**
 * Authentication middleware for TanStack Start server functions
 *
 * This middleware:
 * 1. Extracts session ID from request cookies
 * 2. Validates session against database
 * 3. Enriches context with user data
 * 4. Returns null for user if not authenticated
 *
 * Use this for endpoints where authentication is optional
 */
export const authMiddleware = createMiddleware().server(async ({ request }) => {
	const db = getDbFromEnv()

	// Extract session ID from cookies
	const sessionId = getSessionId(request.headers)
	if (!sessionId) {
		// Not logged in - pass without user context
		return request.next({
			context: {
				user: null,
			} satisfies MiddlewareContext,
		})
	}

	// Validate session and get user ID
	const userId = await auth.validateSession(db, sessionId)
	if (!userId) {
		// Invalid/expired session
		return request.next({
			context: {
				user: null,
			} satisfies MiddlewareContext,
		})
	}

	// Session valid - enrich context with user data
	return request.next({
		context: {
			user: { id: userId },
		} satisfies MiddlewareContext,
	})
})

/**
 * Require authentication - throws if not logged in
 * Use this for endpoints that must have a valid user
 */
export const requireAuthMiddleware = createMiddleware().server(async ({ request }) => {
	const db = getDbFromEnv()
	const sessionId = getSessionId(request.headers)

	if (!sessionId) {
		throw new Error('AUTH_REQUIRED: No session cookie found')
	}

	const userId = await auth.validateSession(db, sessionId)
	if (!userId) {
		throw new Error('AUTH_REQUIRED: Invalid or expired session')
	}

	return request.next({
		context: {
			user: { id: userId },
		} satisfies MiddlewareContext,
	})
})
