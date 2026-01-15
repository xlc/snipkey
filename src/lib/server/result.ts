import type { ApiError } from '@shared/types'

/**
 * Result type for server functions
 */
export type Result<T> = { data: T } | { error: ApiError }

export type SerializedError = {
  name: string
  message: string
  stack?: string
  // biome-ignore lint/complexity/noBannedTypes: Type must match TanStack Start framework's error type signature
  cause?: {} | undefined
}

/**
 * Convert ApiError or Error to SerializedError for TanStack Start
 */
export function serializeApiError(error: ApiError | Error): SerializedError {
  if ('code' in error) {
    // It's an ApiError
    return {
      name: error.code,
      message: error.message,
      stack: undefined,
      cause: (error as ApiError).details as Record<string, unknown> | undefined,
    }
  }
  // It's a regular Error
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause as Record<string, unknown> | undefined,
  }
}

/**
 * Convert Error instances to plain objects for TanStack Start serialization
 */
export function serializeError(error: Error): SerializedError {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    // biome-ignore lint/complexity/noBannedTypes: Type must match TanStack Start framework's error type signature
    cause: error.cause as {} | undefined,
  }
}
