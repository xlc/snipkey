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
      // Use SQL aggregation with json_each to count tags efficiently
      const result = await db
        .selectFrom('snippets')
        .select(['id', sql<string>`tags`.as('tags_json')])
        .where('user_id', '=', userId)
        .execute()

      // Aggregate tags on the server side
      const tagCounts = new Map<string, number>()
      for (const snippet of result) {
        try {
          const tags = JSON.parse(snippet.tags_json)
          // Validate that tags is an array of strings
          if (!Array.isArray(tags)) continue

          for (const tag of tags) {
            if (typeof tag === 'string') {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
            }
          }
        } catch {
          // Skip snippets with invalid tag JSON - data corruption should not prevent returning valid tags
        }
      }

      return {
        data: {
          tags: Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count),
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
