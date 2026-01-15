/**
 * Request context helpers for TanStack Start server functions
 *
 * TanStack Start runs on Cloudflare Workers where we can access
 * the request context through the global scope or function parameters.
 */

/**
 * Get the current request headers from the Workers context
 * This works because TanStack Start server functions run in the Workers context
 */
export function getRequestHeaders(): Headers {
	// In TanStack Start with Cloudflare Workers, we need to access the request
	// For now, we'll use a workaround until we have proper context access
	// This will be updated once TanStack Start exposes request context properly

	// Try to get from global context (set by Workers adapter)
	if (typeof globalThis !== "undefined" && "Request" in globalThis) {
		// @ts-expect-error - Workers context
		const currentRequest = globalThis.currentRequest;
		if (currentRequest) {
			return currentRequest.headers;
		}
	}

	// Fallback: return empty headers
	// TODO: Update this when TanStack Start provides request context access
	return new Headers();
}

/**
 * Get session ID from request cookies
 */
export function getSessionIdFromRequest(): string | undefined {
	const headers = getRequestHeaders();
	return getSessionIdFromHeaders(headers);
}

/**
 * Get session ID from headers
 */
export function getSessionIdFromHeaders(headers: Headers): string | undefined {
	const cookies = headers.get("cookie") ?? "";
	const sessionMatch = cookies.match(/session=([^;]+)/);
	return sessionMatch?.[1];
}
