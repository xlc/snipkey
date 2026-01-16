import { type getDb, newId, nowMs, parseJsonArray, stringifyJsonArray } from '@shared/db/db'
import type { ApiError } from '@shared/types'
import { err, ok } from '@shared/types'
import type { SnippetCreateInput, SnippetListInput, SnippetUpdateInput } from '@shared/validation'
import { sql } from 'kysely'

// List snippets with filtering and pagination
export async function snippetsList(db: ReturnType<typeof getDb>, userId: string, input: SnippetListInput) {
  // Determine sort column and order
  const sortColumn = input.sortBy === 'title' ? 'title' : 'updated_at'
  const sortDirection = input.sortOrder === 'asc' ? 'asc' : 'desc'

  let query = db
    .selectFrom('snippets')
    .where('user_id', '=', userId)
    .orderBy(sortColumn, sortDirection)
    .orderBy('id', sortDirection) // Secondary sort for consistency
    .limit(input.limit)

  // Apply search filter (escape SQL wildcards to prevent injection)
  if (input.query) {
    const escapedQuery = input.query.replace(/[%_\\]/g, '\\$&')
    query = query.where(eb => eb.or([eb('title', 'like', `%${escapedQuery}%`), eb('body', 'like', `%${escapedQuery}%`)]))
  }

  // Apply tag filter using SQLite's json_each for proper array matching
  if (input.tag) {
    // Use raw SQL to properly join with json_each table-valued function
    // This avoids false positives (e.g., "art" matching "smart")
    const tag = input.tag
    query = query.where(
      sql<boolean>`EXISTS (
        SELECT 1 FROM json_each(snippets.tags)
        WHERE json_each.value = ${tag}
      )`,
    )
  }

  // Apply cursor pagination (works with updated_at sorting)
  if (input.cursor && input.sortBy !== 'title') {
    const { updatedAt, id } = input.cursor
    if (sortDirection === 'desc') {
      query = query.where(eb => eb.or([eb('updated_at', '<', updatedAt), eb.and([eb('updated_at', '=', updatedAt), eb('id', '<', id)])]))
    } else {
      query = query.where(eb => eb.or([eb('updated_at', '>', updatedAt), eb.and([eb('updated_at', '=', updatedAt), eb('id', '>', id)])]))
    }
  }

  const items = await query.selectAll().execute()

  // Generate next cursor if we have more items
  let nextCursor:
    | {
        updatedAt: number
        id: string
      }
    | undefined
  if (items.length === input.limit && input.sortBy !== 'title') {
    const lastIndex = items.length - 1
    const lastItem = items[lastIndex]
    if (lastItem) {
      nextCursor = {
        updatedAt: lastItem.updated_at,
        id: lastItem.id,
      }
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
  const snippet = await db.selectFrom('snippets').where('id', '=', id).where('user_id', '=', userId).selectAll().executeTakeFirst()

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
export async function snippetCreate(db: ReturnType<typeof getDb>, userId: string, input: SnippetCreateInput) {
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
export async function snippetUpdate(db: ReturnType<typeof getDb>, userId: string, id: string, input: SnippetUpdateInput) {
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

  const result = await db.updateTable('snippets').set(updateData).where('id', '=', id).where('user_id', '=', userId).executeTakeFirst()

  if (result.numUpdatedRows === 0n) {
    return err({
      code: 'NOT_FOUND',
      message: 'Snippet not found',
    } satisfies ApiError)
  }

  return ok({ success: true })
}

// Delete snippet
export async function snippetDelete(db: ReturnType<typeof getDb>, userId: string, id: string) {
  const result = await db.deleteFrom('snippets').where('id', '=', id).where('user_id', '=', userId).executeTakeFirst()

  if (result.numDeletedRows === 0n) {
    return err({
      code: 'NOT_FOUND',
      message: 'Snippet not found',
    } satisfies ApiError)
  }

  return ok({ success: true })
}
