import type { ApiError } from "@shared/types";
import type { SnippetCreateInput, SnippetListInput, SnippetUpdateInput } from "@shared/validation";
import { createServerFn } from "@tanstack/start";
import { getDbFromEnv } from "~/lib/server/context";
import * as snippets from "~/lib/server/snippets";

type Result<T> = { data: T } | { error: ApiError };

function toResult<T>(result: { ok: boolean; data?: T; error?: ApiError }): Result<T> {
	if (result.ok && result.data !== undefined) {
		return { data: result.data };
	}
	return { error: result.error as ApiError };
}

/**
 * SECURITY WARNING: MOCK_USER_ID is a placeholder for development.
 *
 * All snippet operations currently use a hardcoded user ID, which means:
 * - User isolation is NOT enforced (all users see the same snippets)
 * - Authentication is BYPASSED completely
 * - This is ONLY acceptable for local development
 *
 * PRODUCTION FIX REQUIRED:
 * TanStack Start server functions don't easily expose request context yet.
 * To fix this, we need to:
 * 1. Wait for TanStack Start to expose request context in server functions, OR
 * 2. Implement a middleware pattern that extracts session from cookies, OR
 * 3. Move to a framework with better request context support
 *
 * See: apps/web/src/lib/server/auth-user.ts for the intended implementation
 */
const MOCK_USER_ID = "mock-user-id";

// List snippets
export const snippetsList = createServerFn("GET", async (input: SnippetListInput) => {
	const db = getDbFromEnv();
	const result = await snippets.snippetsList(db, MOCK_USER_ID, input);
	return toResult(result);
});

// Get single snippet
export const snippetGet = createServerFn("GET", async ({ id }: { id: string }) => {
	const db = getDbFromEnv();
	const result = await snippets.snippetGet(db, MOCK_USER_ID, id);
	return toResult(result);
});

// Create snippet
export const snippetCreate = createServerFn("POST", async (input: SnippetCreateInput) => {
	const db = getDbFromEnv();
	const result = await snippets.snippetCreate(db, MOCK_USER_ID, input);
	return toResult(result);
});

// Update snippet
export const snippetUpdate = createServerFn(
	"POST",
	async ({ id, ...input }: { id: string } & SnippetUpdateInput) => {
		const db = getDbFromEnv();
		const result = await snippets.snippetUpdate(db, MOCK_USER_ID, id, input);
		return toResult(result);
	},
);

// Delete snippet
export const snippetDelete = createServerFn("POST", async ({ id }: { id: string }) => {
	const db = getDbFromEnv();
	const result = await snippets.snippetDelete(db, MOCK_USER_ID, id);
	return toResult(result);
});
