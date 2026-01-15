import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/browser'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as auth from '~/lib/server/auth'
import { createClearedSessionCookie, createSessionCookie, getDbFromEnv, getServerFnContext } from '~/lib/server/context'
import { authMiddleware, envMiddleware } from '~/lib/server/middleware'
import type { SerializedError } from '~/lib/server/result'

// Register Start
export const authRegisterStart = createServerFn({ method: 'GET' })
  .middleware([envMiddleware])
  .handler(async ({ context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const result = await auth.authRegisterStart(db, ctx.env)

    if (!result.ok) {
      return {
        error: result.error as SerializedError,
      }
    }

    return { data: result.data }
  })

// Register Finish
export const authRegisterFinish = createServerFn({ method: 'POST' })
  .middleware([envMiddleware])
  .inputValidator(
    z.object({
      attestation: z.any() as z.ZodType<RegistrationResponseJSON>,
      challengeId: z.string(),
    }),
  )
  .handler(async ({ data: { attestation, challengeId }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const result = await auth.authRegisterFinish(db, attestation, challengeId, ctx.env)

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
  .middleware([envMiddleware])
  .handler(async ({ context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const result = await auth.authLoginStart(db, ctx.env)

    if (!result.ok) {
      return {
        error: result.error as SerializedError,
      }
    }

    return { data: result.data }
  })

// Login Finish
export const authLoginFinish = createServerFn({ method: 'POST' })
  .middleware([envMiddleware])
  .inputValidator(
    z.object({
      assertion: z.any() as z.ZodType<AuthenticationResponseJSON>,
      challengeId: z.string(),
    }),
  )
  .handler(async ({ data: { assertion, challengeId }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const result = await auth.authLoginFinish(db, assertion, challengeId, ctx.env)

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
    const context = getServerFnContext(ctx)
    const db = getDbFromEnv(context.env)

    // Revoke session if it exists
    if (context.sessionId && context.user) {
      await auth.authLogout(db, context.sessionId)
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
    const context = getServerFnContext(ctx)

    // If not authenticated, return null user
    if (!context.user) {
      return { data: { user: null } }
    }

    // Return authenticated user info
    return { data: { userId: context.user.id } }
  })
