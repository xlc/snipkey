import type { AuthenticatedContext, MiddlewareContext } from './middleware-types'

/**
 * Server function context with user authentication data
 */
export interface ServerFnContext {
	request: Request
	context: MiddlewareContext
}

/**
 * Server function context for authenticated endpoints
 */
export interface AuthenticatedServerFnContext {
	request: Request
	context: AuthenticatedContext
}
