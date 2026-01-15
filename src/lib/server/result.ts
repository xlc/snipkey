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
