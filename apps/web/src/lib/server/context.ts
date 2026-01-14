import type { Env } from "@shared/db/db";
import { getDb } from "@shared/db/db";

// Global env will be set by the Cloudflare Workers adapter
declare global {
	var env: Env | undefined;
}

// Get database instance from Workers env
export function getDbFromEnv() {
	if (!globalThis.env) {
		throw new Error("Workers environment not available");
	}
	return getDb(globalThis.env);
}

// Get session ID from request headers
export function getSessionId(headers: Headers): string | undefined {
	const cookies = headers.get("cookie") ?? "";
	const sessionMatch = cookies.match(/session=([^;]+)/);
	return sessionMatch?.[1];
}

// Create session cookie header
export function createSessionCookie(sessionId: string): string {
	return `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
}

// Create cleared session cookie header
export function createClearedSessionCookie(): string {
	return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
