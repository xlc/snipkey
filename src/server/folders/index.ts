import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { getDbFromEnv, getServerFnContext } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import { serializeApiError } from '~/lib/server/result'
import * as folders from '~/lib/server/folders'

// Validation schemas
const folderCreateInput = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
})

const folderUpdateInput = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  position: z.number().int().min(0).optional(),
})

// List all folders
export const foldersList = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.foldersList(db, userId)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Get folder tree with snippet counts
export const foldersTree = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.foldersTree(db, userId)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Get single folder
export const folderGet = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.folderGet(db, userId, id)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Create folder
export const folderCreate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(folderCreateInput)
  .handler(async ({ data, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.folderCreate(db, userId, data)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Update folder
export const folderUpdate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ id: z.string().uuid(), data: folderUpdateInput }))
  .handler(async ({ data: { id, data: updateData }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.folderUpdate(db, userId, id, updateData)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })

// Delete folder
export const folderDelete = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id }, context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id
    const result = await folders.folderDelete(db, userId, id)

    if (!result.ok) {
      return {
        error: serializeApiError(result.error),
      }
    }

    return { data: result.data }
  })
