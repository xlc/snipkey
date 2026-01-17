import { z } from 'zod'
import { LIMITS } from './limits'

export const snippetSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(LIMITS.MAX_SNIPPET_TITLE_LENGTH, `Title must be less than ${LIMITS.MAX_SNIPPET_TITLE_LENGTH} characters`)
    .transform(val => val.trim()),
  body: z.string().max(LIMITS.MAX_SNIPPET_BODY_LENGTH, `Body must be less than ${LIMITS.MAX_SNIPPET_BODY_LENGTH} characters`),
  tags: z
    .array(z.string())
    .transform(tags =>
      tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .filter((tag, i, arr) => arr.indexOf(tag) === i),
    )
    .refine(tags => tags.length <= LIMITS.MAX_TAGS_PER_SNIPPET, `Maximum ${LIMITS.MAX_TAGS_PER_SNIPPET} tags allowed`),
  folder_id: z.string().uuid().nullable().optional(),
})

export const snippetCreateInput = snippetSchema

export const snippetUpdateInput = snippetSchema.partial().extend({
  id: z.string().uuid('Invalid snippet ID'),
})

export const snippetListInput = z.object({
  query: z.string().max(LIMITS.MAX_SEARCH_QUERY_LENGTH).optional(),
  tag: z.string().max(LIMITS.MAX_TAG_LENGTH).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  limit: z.number().int().positive().max(LIMITS.MAX_SNIPPETS_PER_PAGE).default(20),
  cursor: z
    .object({
      updatedAt: z.number(),
      id: z.string(),
    })
    .optional(),
  sortBy: z.enum(['updated', 'created', 'title']).default('updated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const authRegisterStartInput = z.object({})

export const authRegisterFinishInput = z.object({
  // WebAuthn attestation response is validated by SimpleWebAuthn library
  // We use z.any() here because the library handles validation internally
  attestation: z.any(),
  challengeId: z.string().uuid('Invalid challenge ID'),
})

export const authLoginStartInput = z.object({})

export const authLoginFinishInput = z.object({
  // WebAuthn assertion response is validated by SimpleWebAuthn library
  // We use z.any() here because the library handles validation internally
  assertion: z.any(),
  challengeId: z.string().uuid('Invalid challenge ID'),
})

export type SnippetCreateInput = z.infer<typeof snippetCreateInput>
export type SnippetUpdateInput = z.infer<typeof snippetUpdateInput>
export type SnippetListInput = z.infer<typeof snippetListInput>
export type AuthRegisterFinishInput = z.infer<typeof authRegisterFinishInput>
export type AuthLoginFinishInput = z.infer<typeof authLoginFinishInput>
