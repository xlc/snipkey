import { snippetCreateInput, snippetListInput, snippetUpdateInput } from '@shared/validation'
import { createServerFn } from '@tanstack/start-client-core'
import { z } from 'zod'
import { getDbFromEnv } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import * as snippets from '~/lib/server/snippets'
import type { ServerFnContext } from '~/lib/server/types'

// List snippets
export const snippetsList = createServerFn({ method: 'GET' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetListInput)
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetsList(db, userId, data)

		if (!result.ok) {
			return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } }
		}

		return { data: result.data }
	})

// Get single snippet
export const snippetGet = createServerFn({ method: 'GET' })
	.middleware([requireAuthMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data: { id }, context }: { data: { id: string }; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetGet(db, userId, id)

		if (!result.ok) {
			return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } | { code: string; message: string } }
		}

		return { data: result.data }
	})

// Create snippet
export const snippetCreate = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetCreateInput)
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetCreate(db, userId, data)

		if (!result.ok) {
			return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } }
		}

		return { data: result.data }
	})

// Update snippet
export const snippetUpdate = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(snippetUpdateInput)
	.handler(async ({ data, context }: { data: any; context: ServerFnContext['context'] }) => {
		const { id } = data
		const validated = data

		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetUpdate(db, userId, id, validated)

		if (!result.ok) {
			return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } | { code: string; message: string } }
		}

		return { data: result.data }
	})

// Delete snippet
export const snippetDelete = createServerFn({ method: 'POST' })
	.middleware([requireAuthMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data: { id }, context }: { data: { id: string }; context: ServerFnContext['context'] }) => {
		const db = getDbFromEnv()
		const userId = (context.user as { id: string }).id
		const result = await snippets.snippetDelete(db, userId, id)

		if (!result.ok) {
			return { error: result.error as { name: string; message: string; stack?: string; cause?: {} | undefined } | { code: string; message: string } }
		}

		return { data: result.data }
	})
