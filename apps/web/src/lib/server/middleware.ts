import { createMiddleware } from "@tanstack/start";
import * as auth from "./auth";
import { getDbFromEnv } from "./context";
import type { MiddlewareContext } from "./middleware-types";

/**
 * Authentication middleware for TanStack Start server functions
 *
 * This middleware:
 * 1. Extracts session ID from request cookies
 * 2. Validates session against database
 * 3. Enriches context with user data
 * 4. Returns null for user if not authenticated
 *
 * Use this for endpoints where authentication is optional
 */
export const authMiddleware = createMiddleware().server(async ({ request }) => {
	const db = getDbFromEnv();

	// Extract session ID from cookies
	const sessionId = extractSessionId(request.headers);
	if (!sessionId) {
		// Not logged in - pass without user context
		return request.next({
			context: {
				user: null,
			} satisfies MiddlewareContext,
		});
	}

	// Validate session and get user ID
	const userId = await auth.validateSession(db, sessionId);
	if (!userId) {
		// Invalid/expired session
		return request.next({
			context: {
				user: null,
			} satisfies MiddlewareContext,
		});
	}

	// Session valid - enrich context with user data
	return request.next({
		context: {
			user: { id: userId },
		} satisfies MiddlewareContext,
	});
});

/**
 * Require authentication - throws if not logged in
 * Use this for endpoints that must have a valid user
 */
export const requireAuthMiddleware = createMiddleware().server(async ({ request }) => {
	const db = getDbFromEnv();
	const sessionId = extractSessionId(request.headers);

	if (!sessionId) {
		throw new Error("AUTH_REQUIRED: No session cookie found");
	}

	const userId = await auth.validateSession(db, sessionId);
	if (!userId) {
		throw new Error("AUTH_REQUIRED: Invalid or expired session");
	}

	return request.next({
		context: {
			user: { id: userId },
		} satisfies MiddlewareContext,
	});
});

/**
 * Extract session ID from request headers
 */
function extractSessionId(headers: Headers): string | undefined {
	const cookies = headers.get("cookie") ?? "";
	const sessionMatch = cookies.match(/session=([^;]+)/);
	return sessionMatch?.[1];
}
