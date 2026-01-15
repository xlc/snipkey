const SESSION_COOKIE_NAME = "session";

/**
 * Get session ID from client-side cookies
 * Note: This only reads non-HttpOnly cookies.
 * The actual session cookie will be HttpOnly and set by the server.
 */
export function getSessionCookie(): string | undefined {
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === SESSION_COOKIE_NAME) {
			return value;
		}
	}
	return undefined;
}

/**
 * @deprecated Session cookies are now set server-side via Set-Cookie headers
 * Client-side code cannot set HttpOnly cookies (which is more secure).
 * This function is kept for backwards compatibility but does nothing.
 */
export function setSessionCookie(_value: string): void {
	// No-op: Server sets HttpOnly session cookie via Set-Cookie header
	// Client-side JavaScript cannot set HttpOnly cookies
	console.warn("setSessionCookie is deprecated. Session cookies are now set server-side.");
}

/**
 * @deprecated Session clearing is now handled server-side
 * Client-side code cannot clear HttpOnly cookies.
 * This function is kept for backwards compatibility but does nothing.
 */
export function clearSessionCookie(): void {
	// No-op: Server clears cookie via Set-Cookie header with Max-Age=0
	console.warn("clearSessionCookie is deprecated. Use the authLogout server function instead.");
}
