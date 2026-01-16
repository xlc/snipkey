import type { ApiError } from '@shared/types'
import { createServerFn } from '@tanstack/react-start'
import { sql } from 'kysely'
import { getDbFromEnv, getServerFnContext } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'

// Get all tags with their counts
export const tagsList = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const ctx = getServerFnContext({ context })
    const db = getDbFromEnv(ctx.env)
    const userId = context.user.id

    try {
      // Use SQL aggregation with json_each to count tags efficiently in the database
      // This is much faster than fetching all snippets and aggregating in memory
      const result = await db
        .selectFrom(sql<string>`snippets, json_each(snippets.tags)`.as('je'))
        .select([sql<string>`json_each.value`.as('tag'), sql<number>`COUNT(*)`.as('count')])
        .where(sql<boolean>`user_id = ${userId}`)
        .groupBy(sql<string>`json_each.value`)
        .orderBy(sql<string>`count`, 'desc')
        .execute()

      return {
        data: {
          tags: result.map((row: unknown) => ({
            tag: (row as { tag: string }).tag,
            count: (row as { count: number }).count,
          })),
        },
      }
    } catch (_error) {
      // Database or unexpected error - return generic error to avoid leaking implementation details
      return {
        error: {
          code: 'INTERNAL',
          message: 'Failed to load tags',
        } satisfies ApiError,
      }
    }
  })
