/**
 * Application limits and constraints
 */
export const LIMITS = {
	MAX_PLACEHOLDERS_PER_SNIPPET: 20,
	MAX_TAGS_PER_SNIPPET: 10,
	MAX_SNIPPET_TITLE_LENGTH: 200,
	MAX_SNIPPET_BODY_LENGTH: 50000,
	MAX_TAG_LENGTH: 50,
	MAX_SEARCH_QUERY_LENGTH: 200,
	MAX_SNIPPETS_PER_PAGE: 100,
} as const

/**
 * Validates placeholder count doesn't exceed limits
 */
export function validatePlaceholderCount(count: number): {
	valid: boolean
	error?: string
} {
	if (count > LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET) {
		return {
			valid: false,
			error: `Maximum ${LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET} placeholders allowed per snippet`,
		}
	}
	return { valid: true }
}
