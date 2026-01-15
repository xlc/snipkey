import type { ApiError } from '@shared/types'
import type { err, ok } from '@shared/types'

/**
 * Result type for server functions
 */
export type Result<T> = { data: T } | { error: ApiError }

/**
 * Converts a result object from the database layer to the server function result type
 *
 * @param result - Result object with ok, data, and error properties
 * @returns Result type with either data or error
 */
export function toResult<T>(result: ReturnType<typeof ok> | ReturnType<typeof err>): Result<T> {
	if (result.ok) {
		if (result.data !== undefined) {
			return { data: result.data as T }
		}
		return { error: { code: 'UNEXPECTED_ERROR', message: 'Data is undefined' } as unknown as ApiError }
	}
	return { error: result.error as unknown as ApiError }
}
