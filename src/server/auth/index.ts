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
import type { AuthenticatedServerFnContext, ServerFnContext } from '~/lib/server/types'

// Register Start
export const authRegisterStart = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDbFromEnv()
	const result = await auth.authRegisterStart(db)

	if (!result.ok) {
		return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } }
	}

	return { data: result.data }
})

// Register Finish
export const authRegisterFinish = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			attestation: z.any() as z.ZodType<RegistrationResponseJSON>,
			challengeId: z.string(),
		}),
	)
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
export const authLoginStart = createServerFn({ method: 'GET' }).handler(async () => {
	const db = getDbFromEnv()
	const result = await auth.authLoginStart(db)

	if (!result.ok) {
		return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } }
	}

	return { data: result.data }
})

// Login Finish
export const authLoginFinish = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			assertion: z.any() as z.ZodType<AuthenticationResponseJSON>,
			challengeId: z.string(),
		}),
	)
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
	.handler(async ctx => {
		const db = getDbFromEnv()

		// Extract session ID from request headers
		const sessionId = getSessionId((ctx as any).request.headers)

		// Revoke session if it exists
		if (sessionId && (ctx as any).context.user) {
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
	.handler(async ctx => {
		// If not authenticated, return null user
		if (!(ctx as any).context.user) {
			return { data: { user: null } }
		}

		// Return authenticated user info
		return { data: { userId: (ctx as any).context.user.id } }
	})
