import type { ApiError } from '@shared/types'
import { createServerFn } from '@tanstack/react-start'
import { sql } from 'kysely'
import { getDbFromEnv } from '~/lib/server/context'
import { requireAuthMiddleware } from '~/lib/server/middleware'

// Get all tags with their counts
export const tagsList = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const db = getDbFromEnv()
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
          const tags = JSON.parse(snippet.tags_json) as string[]
          for (const tag of tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          }
        } catch {
          // Skip invalid JSON
        }
      }

      return {
        data: {
          tags: Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count),
        },
      }
    } catch {
      return {
        error: {
          code: 'INTERNAL',
          message: 'Failed to load tags',
        } satisfies ApiError,
      }
    }
  })
