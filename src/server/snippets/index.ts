import type { ApiError } from '@shared/types'
import type { SnippetCreateInput, SnippetListInput, SnippetUpdateInput } from '@shared/validation'
import { createServerFn } from '@tanstack/start'
import { getDbFromEnv } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import * as snippets from '~/lib/server/snippets'
import type { ServerFnContext } from '~/lib/server/types'

type Result<T> = { data: T } | { error: ApiError }

function toResult<T>(result: { ok: boolean; data?: T; error?: ApiError }): Result<T> {
	if (result.ok && result.data !== undefined) {
		return { data: result.data }
	}
	return { error: result.error as ApiError }
}

// List snippets
export const snippetsList = createServerFn(
	'GET',
	async (input: SnippetListInput, ctx: ServerFnContext) => {
		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetsList(db, userId, input)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])

// Get single snippet
export const snippetGet = createServerFn(
	'GET',
	async ({ id }: { id: string }, ctx: ServerFnContext) => {
		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetGet(db, userId, id)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])

// Create snippet
export const snippetCreate = createServerFn(
	'POST',
	async (input: SnippetCreateInput, ctx: ServerFnContext) => {
		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetCreate(db, userId, input)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])

// Update snippet
export const snippetUpdate = createServerFn(
	'POST',
	async ({ id, ...input }: { id: string } & SnippetUpdateInput, ctx: ServerFnContext) => {
		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetUpdate(db, userId, id, input)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])

// Delete snippet
export const snippetDelete = createServerFn(
	'POST',
	async ({ id }: { id: string }, ctx: ServerFnContext) => {
		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetDelete(db, userId, id)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])
