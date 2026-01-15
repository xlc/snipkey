import { snippetCreateInput, snippetListInput, snippetUpdateInput } from '@shared/validation'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDbFromEnv, getServerFnContext } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import { serializeApiError } from '~/lib/server/result'
import * as snippets from '~/lib/server/snippets'

// List snippets
export const snippetsList = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator(snippetListInput)
  .handler(async ({ data, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await snippets.snippetsList(db, userId, data)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Get single snippet
export const snippetGet = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await snippets.snippetGet(db, userId, id)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Create snippet
export const snippetCreate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(snippetCreateInput)
  .handler(async ({ data, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await snippets.snippetCreate(db, userId, data)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Update snippet
export const snippetUpdate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(snippetUpdateInput)
  .handler(async ({ data, context }) => {
    const { id } = data
    const validated = data

    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await snippets.snippetUpdate(db, userId, id, validated)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Delete snippet
export const snippetDelete = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await snippets.snippetDelete(db, userId, id)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })
