import type { MiddlewareContext } from "./middleware-types";

/**
 * Server function context with user authentication data
 */
export interface ServerFnContext {
	request: Request;
	context: MiddlewareContext;
}
