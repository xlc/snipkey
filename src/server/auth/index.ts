import type { ApiError } from '@shared/types'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/browser'
import { createServerFn } from '@tanstack/start'
import * as auth from '~/lib/server/auth'
import {
	createClearedSessionCookie,
	createSessionCookie,
	getDbFromEnv,
	getSessionId,
} from '~/lib/server/context'
import { authMiddleware } from '~/lib/server/middleware'
import type { ServerFnContext } from '~/lib/server/types'

type Result<T> = { data: T } | { error: ApiError }

function toResult<T>(result: { ok: boolean; data?: T; error?: ApiError }): Result<T> {
	if (result.ok && result.data !== undefined) {
		return { data: result.data }
	}
	return { error: result.error as ApiError }
}

// Register Start
export const authRegisterStart = createServerFn({ method: 'GET' }, async () => {
	const db = getDbFromEnv()
	const result = await auth.authRegisterStart(db)
	return toResult(result)
})

// Register Finish
export const authRegisterFinish = createServerFn(
	{ method: 'POST' },
	async ({
		attestation,
		challengeId,
	}: {
		attestation: RegistrationResponseJSON
		challengeId: string
	}) => {
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
	},
)

// Login Start
export const authLoginStart = createServerFn({ method: 'GET' }, async () => {
	const db = getDbFromEnv()
	const result = await auth.authLoginStart(db)
	return toResult(result)
})

// Login Finish
export const authLoginFinish = createServerFn(
	{ method: 'POST' },
	async ({
		assertion,
		challengeId,
	}: {
		assertion: AuthenticationResponseJSON
		challengeId: string
	}) => {
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
	},
)

// Logout
export const authLogout = createServerFn(
	{ method: 'POST' },
	async (_: undefined, ctx: ServerFnContext) => {
		const db = getDbFromEnv()

		// Extract session ID from request headers
		const sessionId = getSessionId(ctx.request.headers)

		// Revoke session if it exists
		if (sessionId && ctx.context.user) {
			await auth.authLogout(db, sessionId)
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': createClearedSessionCookie(),
			},
		})
	},
).middleware([authMiddleware])

// Get current user
export const authMe = createServerFn(
	{ method: 'GET' },
	async (_: undefined, ctx: ServerFnContext) => {
		// If not authenticated, return null user
		if (!ctx.context.user) {
			return { data: { user: null } }
		}

		// Return authenticated user info
		return { data: { userId: ctx.context.user.id } }
	},
).middleware([authMiddleware])
