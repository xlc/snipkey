import type { ApiError } from '@shared/types'

/**
 * Result type for server functions
 */
export type Result<T> = { data: T } | { error: ApiError }

/**
 * Convert Error instances to plain objects for TanStack Start serialization
 * TypeScript's Error type has `cause: unknown` but TanStack expects `cause: {} | undefined`
 */
export function serializeError(error: Error): { name: string; message: string; stack?: string; cause?: {} | undefined } {
	return {
		name: error.name,
		message: error.message,
		stack: error.stack,
		cause: error.cause as {} | undefined,
	}
}

