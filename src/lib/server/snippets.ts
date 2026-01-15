import { type getDb, newId, nowMs, parseJsonArray, stringifyJsonArray } from '@shared/db/db'
import type { ApiError } from '@shared/types'
import { err, ok } from '@shared/types'
import type { SnippetCreateInput, SnippetListInput, SnippetUpdateInput } from '@shared/validation'

// List snippets with filtering and pagination
export async function snippetsList(
	db: ReturnType<typeof getDb>,
	userId: string,
	input: SnippetListInput,
) {
	let query = db
		.selectFrom('snippets')
		.where('user_id', '=', userId)
		.orderBy('updated_at', 'desc')
		.orderBy('id', 'desc')
		.limit(input.limit)

	// Apply search filter (escape SQL wildcards to prevent injection)
	if (input.query) {
		const escapedQuery = input.query.replace(/[%_\\]/g, '\\$&')
		query = query.where(eb =>
			eb.or([eb('title', 'like', `%${escapedQuery}%`), eb('body', 'like', `%${escapedQuery}%`)]),
		)
	}

	// Apply tag filter (escape quotes and backslashes to prevent injection)
	if (input.tag) {
		const escapedTag = input.tag.replace(/["\\]/g, '\\$&')
		query = query.where('tags', 'like', `%"${escapedTag}"%`)
	}

	// Apply cursor pagination
	if (input.cursor) {
		const { updatedAt, id } = input.cursor
		query = query.where(eb =>
			eb.or([
				eb('updated_at', '<', updatedAt),
				eb.and([eb('updated_at', '=', updatedAt), eb('id', '<', id)]),
			]),
		)
	}

	const items = await query.selectAll()

	// Generate next cursor if we have more items
	let nextCursor:
		| {
				updatedAt: number
				id: string
		  }
		| undefined
	if (items.length === input.limit) {
		const lastItem = items[items.length - 1]
		nextCursor = {
			updatedAt: lastItem.updated_at,
			id: lastItem.id,
		}
	}

	return ok({
		items: items.map(item => ({
			...item,
			tags: parseJsonArray(item.tags),
		})),
		nextCursor,
	})
}

// Get single snippet
export async function snippetGet(db: ReturnType<typeof getDb>, userId: string, id: string) {
	const snippet = await db
		.selectFrom('snippets')
		.where('id', '=', id)
		.where('user_id', '=', userId)
		.selectAll()
		.executeTakeFirst()

	if (!snippet) {
		return err({
			code: 'NOT_FOUND',
			message: 'Snippet not found',
		} satisfies ApiError)
	}

	return ok({
		...snippet,
		tags: parseJsonArray(snippet.tags),
	})
}

// Create snippet
export async function snippetCreate(
	db: ReturnType<typeof getDb>,
	userId: string,
	input: SnippetCreateInput,
) {
	const id = newId()
	const now = nowMs()

	await db
		.insertInto('snippets')
		.values({
			id,
			user_id: userId,
			title: input.title,
			body: input.body,
			tags: stringifyJsonArray(input.tags),
			created_at: now,
			updated_at: now,
		})
		.execute()

	return ok({ id })
}

// Update snippet
export async function snippetUpdate(
	db: ReturnType<typeof getDb>,
	userId: string,
	id: string,
	input: SnippetUpdateInput,
) {
	const now = nowMs()

	// Build update object dynamically, only including defined fields
	const updateData: Record<string, unknown> = { updated_at: now }

	if (input.title !== undefined) {
		updateData.title = input.title
	}
	if (input.body !== undefined) {
		updateData.body = input.body
	}
	if (input.tags !== undefined) {
		updateData.tags = stringifyJsonArray(input.tags)
	}

	const result = await db
		.updateTable('snippets')
		.set(updateData)
		.where('id', '=', id)
		.where('user_id', '=', userId)
		.executeTakeFirst()

	if (result.numUpdatedRows === 0) {
		return err({
			code: 'NOT_FOUND',
			message: 'Snippet not found',
		} satisfies ApiError)
	}

	return ok({ success: true })
}

// Delete snippet
export async function snippetDelete(db: ReturnType<typeof getDb>, userId: string, id: string) {
	const result = await db
		.deleteFrom('snippets')
		.where('id', '=', id)
		.where('user_id', '=', userId)
		.executeTakeFirst()

	if (result.numDeletedRows === 0) {
		return err({
			code: 'NOT_FOUND',
			message: 'Snippet not found',
		} satisfies ApiError)
	}

	return ok({ success: true })
}
