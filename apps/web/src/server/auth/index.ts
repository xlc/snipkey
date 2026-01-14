import type { ApiError } from "@shared/types";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import { createServerFn } from "@tanstack/start";
import * as auth from "~/lib/server/auth";
import { getDbFromEnv } from "~/lib/server/context";

type Result<T> = { data: T } | { error: ApiError };

function toResult<T>(result: { ok: boolean; data?: T; error?: ApiError }): Result<T> {
	if (result.ok && result.data !== undefined) {
		return { data: result.data };
	}
	return { error: result.error as ApiError };
}

// Register Start
export const authRegisterStart = createServerFn({ method: "GET" }, async () => {
	const db = getDbFromEnv();
	const result = await auth.authRegisterStart(db);
	return toResult(result);
});

// Register Finish
export const authRegisterFinish = createServerFn(
	{ method: "POST" },
	async ({
		attestation,
		challengeId,
	}: {
		attestation: RegistrationResponseJSON;
		challengeId: string;
	}) => {
		const db = getDbFromEnv();
		const result = await auth.authRegisterFinish(db, attestation, challengeId);
		return toResult(result);
	},
);

// Login Start
export const authLoginStart = createServerFn({ method: "GET" }, async () => {
	const db = getDbFromEnv();
	const result = await auth.authLoginStart(db);
	return toResult(result);
});

// Login Finish
export const authLoginFinish = createServerFn(
	{ method: "POST" },
	async ({
		assertion,
		challengeId,
	}: {
		assertion: AuthenticationResponseJSON;
		challengeId: string;
	}) => {
		const db = getDbFromEnv();
		const result = await auth.authLoginFinish(db, assertion, challengeId);
		return toResult(result);
	},
);

// Logout
export const authLogout = createServerFn({ method: "POST" }, async () => {
	const db = getDbFromEnv();
	// TODO: Get session ID from request
	const sessionId = ""; // Placeholder
	const result = await auth.authLogout(db, sessionId);
	return toResult(result);
});

// Get current user
export const authMe = createServerFn({ method: "GET" }, async () => {
	const db = getDbFromEnv();
	// TODO: Get session ID from request
	const sessionId = ""; // Placeholder
	const user = await auth.getUserFromSession(db, sessionId);

	if (!user) {
		return { error: { code: "AUTH_REQUIRED" as const, message: "No valid session" } };
	}

	return { data: { userId: user.userId } };
});
