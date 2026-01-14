import { getDb, newId, nowMs } from "@shared/db/db";
import type { ApiError } from "@shared/types";
import { err, ok } from "@shared/types";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";

// Environment config will be loaded from wrangler vars via TanStack Start
export interface AuthConfig {
	rpID: string;
	origin: string;
	challengeTTLMs: number;
	sessionTTLMs: number;
}

function getConfig(): AuthConfig {
	// These will be available in Workers via env.vars
	return {
		rpID: "localhost", // Will be configurable via env
		origin: "http://localhost:5173", // Will be configurable via env
		challengeTTLMs: 5 * 60 * 1000, // 5 minutes
		sessionTTLMs: 7 * 24 * 60 * 60 * 1000, // 7 days
	};
}

// Helper to cleanup expired challenges
async function cleanupExpiredChallenges(db: ReturnType<typeof getDb>): Promise<void> {
	const now = nowMs();
	await db.deleteFrom("auth_challenges").where("expires_at", "<", now).execute();
}

// Helper to cleanup expired sessions for a user
async function cleanupExpiredSessions(db: ReturnType<typeof getDb>, userId: string): Promise<void> {
	const now = nowMs();
	await db
		.deleteFrom("sessions")
		.where("user_id", "=", userId)
		.where("expires_at", "<", now)
		.execute();
}

// Create a new session
export async function createSession(
	db: ReturnType<typeof getDb>,
	userId: string,
): Promise<{ sessionId: string; expiresAt: number }> {
	const config = getConfig();
	const sessionId = newId();
	const now = nowMs();
	const expiresAt = now + config.sessionTTLMs;

	await db
		.insertInto("sessions")
		.values({
			id: sessionId,
			user_id: userId,
			created_at: now,
			expires_at: expiresAt,
		})
		.execute();

	return { sessionId, expiresAt };
}

// Validate session and return user ID
export async function validateSession(
	db: ReturnType<typeof getDb>,
	sessionId: string,
): Promise<string | null> {
	const now = nowMs();
	const session = await db
		.selectFrom("sessions")
		.where("id", "=", sessionId)
		.where("expires_at", ">", now)
		.where("revoked_at", "is", null)
		.select(["user_id", "expires_at"])
		.executeTakeFirst();

	return session?.user_id ?? null;
}

// Revoke a session
export async function revokeSession(
	db: ReturnType<typeof getDb>,
	sessionId: string,
): Promise<void> {
	await db
		.updateTable("sessions")
		.set({ revoked_at: nowMs() })
		.where("id", "=", sessionId)
		.execute();
}

// Generate registration options
export async function authRegisterStart(db: ReturnType<typeof getDb>) {
	await cleanupExpiredChallenges(db);
	const config = getConfig();
	const userId = newId();
	const challengeId = newId();

	const options = await generateRegistrationOptions({
		rpName: "Snipkey",
		rpID: config.rpID,
		userID: userId,
		userName: userId, // Using user ID as username for discoverable passkeys
		authenticatorSelection: {
			authenticatorAttachment: "platform",
			userVerification: "preferred",
		},
	});

	// Store challenge
	await db
		.insertInto("auth_challenges")
		.values({
			id: challengeId,
			challenge: options.challenge,
			type: "registration",
			user_id: userId,
			expires_at: nowMs() + config.challengeTTLMs,
			created_at: nowMs(),
		})
		.execute();

	// Create user row
	await db
		.insertInto("users")
		.values({
			id: userId,
			created_at: nowMs(),
		})
		.execute();

	return ok({ options, challengeId });
}

// Verify registration response
export async function authRegisterFinish(
	db: ReturnType<typeof getDb>,
	attestation: RegistrationResponseJSON,
	challengeId: string,
) {
	const config = getConfig();
	const now = nowMs();

	// Load challenge
	const challenge = await db
		.selectFrom("auth_challenges")
		.where("id", "=", challengeId)
		.where("type", "=", "registration")
		.where("expires_at", ">", now)
		.select(["challenge", "user_id"])
		.executeTakeFirst();

	if (!challenge) {
		return err({
			code: "VALIDATION_ERROR",
			message: "Invalid or expired challenge",
			details: { challengeId },
		} satisfies ApiError);
	}

	// Verify attestation
	const verification = await verifyRegistrationResponse({
		response: attestation,
		expectedChallenge: challenge.challenge,
		expectedOrigin: config.origin,
		expectedRPID: config.rpID,
	});

	if (!verification.verified) {
		return err({
			code: "VALIDATION_ERROR",
			message: "Failed to verify registration",
			details: { verificationError: verification.registrationInfo },
		} satisfies ApiError);
	}

	// Store credential
	const { credential } = verification.registrationInfo ?? {};

	if (!credential) {
		return err({
			code: "INTERNAL",
			message: "No credential in verification response",
		} satisfies ApiError);
	}

	await db
		.insertInto("webauthn_credentials")
		.values({
			credential_id: credential.id,
			user_id: challenge.user_id,
			public_key: JSON.stringify(credential.publicKey),
			counter: credential.counter,
			transports: JSON.stringify(credential.transports ?? []),
			created_at: nowMs(),
		})
		.execute();

	// Delete challenge
	await db.deleteFrom("auth_challenges").where("id", "=", challengeId).execute();

	// Create session
	const { sessionId } = await createSession(db, challenge.user_id);

	// Cleanup expired sessions for this user
	await cleanupExpiredSessions(db, challenge.user_id);

	return ok({ sessionId, userId: challenge.user_id });
}

// Generate authentication options
export async function authLoginStart(db: ReturnType<typeof getDb>) {
	await cleanupExpiredChallenges(db);
	const config = getConfig();
	const challengeId = newId();

	const options = await generateAuthenticationOptions({
		rpID: config.rpID,
		userVerification: "preferred",
		authenticatorSelection: {
			authenticatorAttachment: "platform",
			userVerification: "preferred",
		},
	});

	// Store challenge
	await db
		.insertInto("auth_challenges")
		.values({
			id: challengeId,
			challenge: options.challenge,
			type: "authentication",
			user_id: null,
			expires_at: nowMs() + config.challengeTTLMs,
			created_at: nowMs(),
		})
		.execute();

	return ok({ options, challengeId });
}

// Verify authentication response
export async function authLoginFinish(
	db: ReturnType<typeof getDb>,
	assertion: AuthenticationResponseJSON,
	challengeId: string,
) {
	const config = getConfig();
	const now = nowMs();

	// Load challenge
	const challenge = await db
		.selectFrom("auth_challenges")
		.where("id", "=", challengeId)
		.where("type", "=", "authentication")
		.where("expires_at", ">", now)
		.select(["challenge"])
		.executeTakeFirst();

	if (!challenge) {
		return err({
			code: "VALIDATION_ERROR",
			message: "Invalid or expired challenge",
			details: { challengeId },
		} satisfies ApiError);
	}

	// Find credential
	const credentialRecord = await db
		.selectFrom("webauthn_credentials")
		.where("credential_id", "=", assertion.id)
		.select(["credential_id", "user_id", "public_key", "counter", "transports"])
		.executeTakeFirst();

	if (!credentialRecord) {
		return err({
			code: "NOT_FOUND",
			message: "Credential not found",
		} satisfies ApiError);
	}

	// Verify assertion
	const verification = await verifyAuthenticationResponse({
		response: assertion,
		expectedChallenge: challenge.challenge,
		expectedOrigin: config.origin,
		expectedRPID: config.rpID,
		authenticator: {
			credentialID: credentialRecord.credential_id,
			credentialPublicKey: JSON.parse(credentialRecord.public_key),
			counter: credentialRecord.counter,
		},
	});

	if (!verification.verified) {
		return err({
			code: "VALIDATION_ERROR",
			message: "Failed to verify authentication",
			details: { verificationError: verification.authenticationInfo },
		} satisfies ApiError);
	}

	// Update counter
	const { newCounter } = verification.authenticationInfo ?? {};
	if (newCounter !== undefined) {
		await db
			.updateTable("webauthn_credentials")
			.set({ counter: newCounter })
			.where("credential_id", "=", credentialRecord.credential_id)
			.execute();
	}

	// Delete challenge
	await db.deleteFrom("auth_challenges").where("id", "=", challengeId).execute();

	// Create session
	const { sessionId } = await createSession(db, credentialRecord.user_id);

	// Cleanup expired sessions for this user
	await cleanupExpiredSessions(db, credentialRecord.user_id);

	return ok({ sessionId, userId: credentialRecord.user_id });
}

// Logout - revoke session
export async function authLogout(db: ReturnType<typeof getDb>, sessionId: string) {
	await revokeSession(db, sessionId);
	return ok({ success: true });
}

// Get user from session
export async function getUserFromSession(
	db: ReturnType<typeof getDb>,
	sessionId: string,
): Promise<{ userId: string } | null> {
	const userId = await validateSession(db, sessionId);
	if (!userId) {
		return null;
	}
	return { userId };
}
