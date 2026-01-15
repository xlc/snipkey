import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/browser'
import { createServerFn } from '@tanstack/start-client-core'
import { z } from 'zod'
import * as auth from '~/lib/server/auth'
import {
	createClearedSessionCookie,
	createSessionCookie,
	getDbFromEnv,
	getSessionId,
} from '~/lib/server/context'
import { authMiddleware } from '~/lib/server/middleware'
import { toResult } from '~/lib/server/result'
import type { ServerFnContext } from '~/lib/server/types'

// Register Start
export const authRegisterStart = createServerFn({ method: 'GET' })
	// @ts-ignore - API signature change
	.handler(async () => {
		const db = getDbFromEnv()
		const result = await auth.authRegisterStart(db)
		return toResult(result)
	})

// Register Finish
export const authRegisterFinish = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			attestation: z.any() as z.ZodType<RegistrationResponseJSON>,
			challengeId: z.string(),
		}),
	)
	// @ts-ignore - API signature change
	.handler(async ({ data: { attestation, challengeId } }) => {
		const db = getDbFromEnv()
		const result = await auth.authRegisterFinish(db, attestation, challengeId)

		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		const { sessionId, sessionTTLSeconds } = result.data

		return new Response(JSON.stringify(result.data), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': createSessionCookie(sessionId, sessionTTLSeconds),
			},
		})
	})

// Login Start
export const authLoginStart = createServerFn({ method: 'GET' })
	// @ts-ignore - API signature change
	.handler(async () => {
		const db = getDbFromEnv()
		const result = await auth.authLoginStart(db)
		return toResult(result)
	})

// Login Finish
export const authLoginFinish = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			assertion: z.any() as z.ZodType<AuthenticationResponseJSON>,
			challengeId: z.string(),
		}),
	)
	// @ts-ignore - API signature change
	.handler(async ({ data: { assertion, challengeId } }) => {
		const db = getDbFromEnv()
		const result = await auth.authLoginFinish(db, assertion, challengeId)

		if (!result.ok) {
			return new Response(JSON.stringify({ error: result.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		}

		const { sessionId, sessionTTLSeconds } = result.data

		return new Response(JSON.stringify(result.data), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': createSessionCookie(sessionId, sessionTTLSeconds),
			},
		})
	})

// Logout
export const authLogout = createServerFn({ method: 'POST' })
	.middleware([authMiddleware])
	// @ts-ignore - API signature change
	.handler(async (_ctx: ServerFnContext) => {
		const db = getDbFromEnv()

		// Extract session ID from request headers
		const sessionId = getSessionId(_ctx.request.headers)

		// Revoke session if it exists
		if (sessionId && _ctx.context.user) {
			await auth.authLogout(db, sessionId)
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': createClearedSessionCookie(),
			},
		})
	})

// Get current user
export const authMe = createServerFn({ method: 'GET' })
	.middleware([authMiddleware])
	// @ts-ignore - API signature change
	.handler(async (_ctx: ServerFnContext) => {
		// If not authenticated, return null user
		if (!_ctx.context.user) {
			return { data: { user: null } }
		}

		// Return authenticated user info
		return { data: { userId: _ctx.context.user.id } }
	})
