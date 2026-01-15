import { snippetCreateInput, snippetListInput, snippetUpdateInput } from '@shared/validation'
import { createServerFn } from '@tanstack/start-client-core'
import { z } from 'zod'
import { getDbFromEnv } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import * as snippets from '~/lib/server/snippets'
import { toResult } from '~/lib/server/result'
import type { ServerFnContext } from '~/lib/server/types'

// List snippets
export const snippetsList = createServerFn({ method: 'GET' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetListInput)
	// @ts-ignore - API signature change
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetsList(db, userId, data)
		return toResult(result)
	})

// Get single snippet
export const snippetGet = createServerFn({ method: 'GET' })
	.middleware([requireAuthMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	// @ts-ignore - API signature change
	.handler(async ({ data: { id }, context }: { data: { id: string }; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetGet(db, userId, id)
		return toResult(result)
	})

// Create snippet
export const snippetCreate = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetCreateInput)
	// @ts-ignore - API signature change
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetCreate(db, userId, data)
		return toResult(result)
	})

// Update snippet
export const snippetUpdate = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetUpdateInput)
	// @ts-ignore - API signature change
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const { id } = data
		const validated = data

		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetUpdate(db, userId, id, validated)
		return toResult(result)
	})

// Delete snippet
export const snippetDelete = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	// @ts-ignore - API signature change
	.handler(async ({ data: { id }, context }: { data: { id: string }; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetDelete(db, userId, id)
		return toResult(result)
	})
