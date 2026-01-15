import { snippetCreateInput, snippetListInput, snippetUpdateInput } from '@shared/validation'
import { createServerFn } from '@tanstack/start'
import { getDbFromEnv } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'
import * as snippets from '~/lib/server/snippets'
import { toResult } from '~/lib/server/result'
import type { ServerFnContext } from '~/lib/server/types'

// List snippets
export const snippetsList = createServerFn('GET', async (input: unknown, ctx: ServerFnContext) => {
	// Validate input
	const validated = snippetListInput.parse(input)

	const db = getDbFromEnv()
	const userId = ctx.context.user.id
	const result = await snippets.snippetsList(db, userId, validated)
	return toResult(result)
}).middleware([requireAuthMiddleware])

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
	async (input: unknown, ctx: ServerFnContext) => {
		// Validate input
		const validated = snippetCreateInput.parse(input)

		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetCreate(db, userId, validated)
		return toResult(result)
	},
).middleware([requireAuthMiddleware])

// Update snippet
export const snippetUpdate = createServerFn(
	'POST',
	async (input: unknown, ctx: ServerFnContext) => {
		// Validate input
		const validated = snippetUpdateInput.parse(input)
		const { id, ...data } = validated

		const db = getDbFromEnv()
		const userId = ctx.context.user.id
		const result = await snippets.snippetUpdate(db, userId, id, data)
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
