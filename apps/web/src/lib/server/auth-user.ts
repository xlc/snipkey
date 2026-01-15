import { getDbFromEnv } from "./context";

/**
 * Authenticate the current request and get the user ID
 * Throws an error if authentication fails
 *
 * This function extracts the session ID from request headers
 * and validates it against the database.
 *
 * @returns The authenticated user's ID
 * @throws Error if no valid session exists
 */
export async function requireUser(): Promise<string> {
	const _db = getDbFromEnv();

	// TODO: Extract session ID from request headers
	// For now, we need to access the request context which TanStack Start
	// doesn't easily expose in server functions yet.
	// This is a placeholder that demonstrates the intended pattern.

	// In the full implementation, this would be:
	// const sessionId = getSessionId(request.headers);
	// For now, we'll throw an error to force proper implementation

	throw new Error(
		"requireUser: Request context not available. " +
			"Session management requires access to request headers. " +
			"TODO: Integrate with TanStack Start middleware system to access request context.",
	);

	// Intended implementation:
	// const sessionId = getSessionId(request.headers);
	// if (!sessionId) {
	// 	throw new Error("AUTH_REQUIRED: No session cookie found");
	// }
	//
	// const userId = await auth.validateSession(db, sessionId);
	// if (!userId) {
	// 	throw new Error("AUTH_REQUIRED: Invalid or expired session");
	// }
	//
	// return userId;
}

/**
 * Optional user authentication - returns user ID if logged in, null otherwise
 * Unlike requireUser, this doesn't throw if no session exists
 */
export async function getOptionalUser(): Promise<string | null> {
	try {
		return await requireUser();
	} catch {
		return null;
	}
}
