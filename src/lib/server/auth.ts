import { type getDb, newId, nowMs } from '@shared/db/db'
import type { ApiError } from '@shared/types'
import { err, ok } from '@shared/types'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

// Hex encoding helpers for Uint8Array
function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes as Uint8Array<ArrayBuffer>
}

// Environment config will be loaded from wrangler vars via TanStack Start
export interface AuthConfig {
  rpID: string
  origin: string
  challengeTTLMs: number
  sessionTTLMs: number
}

function getConfig(env: CloudflareEnv): AuthConfig {
  return {
    rpID: env.RP_ID ?? 'localhost',
    origin: env.ORIGIN ?? 'http://localhost:5173',
    challengeTTLMs: 5 * 60 * 1000, // 5 minutes
    sessionTTLMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  }
}

// Helper to cleanup expired challenges
async function cleanupExpiredChallenges(db: ReturnType<typeof getDb>): Promise<void> {
  const now = nowMs()
  await db.deleteFrom('auth_challenges').where('expires_at', '<', now).execute()
}

// Helper to cleanup expired sessions for a user
async function cleanupExpiredSessions(db: ReturnType<typeof getDb>, userId: string): Promise<void> {
  const now = nowMs()
  await db.deleteFrom('sessions').where('user_id', '=', userId).where('expires_at', '<', now).execute()
}

// Create a new session
export async function createSession(
  db: ReturnType<typeof getDb>,
  userId: string,
  env: CloudflareEnv,
): Promise<{ sessionId: string; expiresAt: number; sessionTTLSeconds: number }> {
  const config = getConfig(env)
  const sessionId = newId()
  const now = nowMs()
  const expiresAt = now + config.sessionTTLMs

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: userId,
      created_at: now,
      expires_at: expiresAt,
    })
    .execute()

  return { sessionId, expiresAt, sessionTTLSeconds: Math.floor(config.sessionTTLMs / 1000) }
}

// Validate session and return user ID
export async function validateSession(db: ReturnType<typeof getDb>, sessionId: string): Promise<string | null> {
  const now = nowMs()
  const session = await db
    .selectFrom('sessions')
    .where('id', '=', sessionId)
    .where('expires_at', '>', now)
    .where('revoked_at', 'is', null)
    .select(['user_id', 'expires_at'])
    .executeTakeFirst()

  return session?.user_id ?? null
}

// Renew session (extend expiration time)
// Returns true if session was renewed, false if session doesn't exist or is revoked
export async function renewSession(db: ReturnType<typeof getDb>, sessionId: string, env: CloudflareEnv): Promise<boolean> {
  const config = getConfig(env)
  const now = nowMs()
  const newExpiresAt = now + config.sessionTTLMs

  const result = await db
    .updateTable('sessions')
    .set({ expires_at: newExpiresAt })
    .where('id', '=', sessionId)
    .where('revoked_at', 'is', null)
    .executeTakeFirst()

  // If no rows were updated, session doesn't exist or is revoked
  return result.numUpdatedRows > 0
}

// Validate session and auto-renew if it's getting close to expiration
// Returns user ID if valid, null if invalid
// Optionally returns new session cookie if renewed
export async function validateSessionWithRenewal(
  db: ReturnType<typeof getDb>,
  sessionId: string,
  env: CloudflareEnv,
): Promise<{ userId: string; renewed: boolean; sessionTTLSeconds: number } | null> {
  const config = getConfig(env)
  const now = nowMs()
  const renewalThreshold = config.sessionTTLMs / 2 // Renew when less than half time remains

  const session = await db
    .selectFrom('sessions')
    .where('id', '=', sessionId)
    .where('expires_at', '>', now)
    .where('revoked_at', 'is', null)
    .select(['user_id', 'expires_at'])
    .executeTakeFirst()

  if (!session) {
    return null
  }

  // Check if session should be renewed (less than half time remaining)
  const timeRemaining = session.expires_at - now
  const shouldRenew = timeRemaining < renewalThreshold

  if (shouldRenew) {
    const renewed = await renewSession(db, sessionId, env)
    if (renewed) {
      return {
        userId: session.user_id,
        renewed: true,
        sessionTTLSeconds: Math.floor(config.sessionTTLMs / 1000),
      }
    }
  }

  return {
    userId: session.user_id,
    renewed: false,
    sessionTTLSeconds: Math.floor(timeRemaining / 1000),
  }
}

// Revoke a session
export async function revokeSession(db: ReturnType<typeof getDb>, sessionId: string): Promise<void> {
  await db.updateTable('sessions').set({ revoked_at: nowMs() }).where('id', '=', sessionId).execute()
}

// Generate registration options
export async function authRegisterStart(db: ReturnType<typeof getDb>, env: CloudflareEnv) {
  await cleanupExpiredChallenges(db)
  const config = getConfig(env)
  const userId = newId()
  const challengeId = newId()

  const options = await generateRegistrationOptions({
    rpName: 'Snipkey',
    rpID: config.rpID,
    userID: new TextEncoder().encode(userId),
    userName: userId, // Using user ID as username for discoverable passkeys
  })

  // Store challenge with userId in metadata (not in user_id column to avoid FK violation)
  // user_id is NULL for registration challenges since user doesn't exist yet
  await db
    .insertInto('auth_challenges')
    .values({
      id: challengeId,
      challenge: JSON.stringify({ challenge: options.challenge, pendingUserId: userId }),
      type: 'registration',
      user_id: null, // NULL because user doesn't exist yet
      expires_at: nowMs() + config.challengeTTLMs,
      created_at: nowMs(),
    })
    .execute()

  return ok({ options, challengeId })
}

// Verify registration response
export async function authRegisterFinish(
  db: ReturnType<typeof getDb>,
  attestation: RegistrationResponseJSON,
  challengeId: string,
  env: CloudflareEnv,
) {
  const config = getConfig(env)
  const now = nowMs()

  // Load challenge
  const challengeRecord = await db
    .selectFrom('auth_challenges')
    .where('id', '=', challengeId)
    .where('type', '=', 'registration')
    .where('expires_at', '>', now)
    .select(['challenge'])
    .executeTakeFirst()

  if (!challengeRecord) {
    return err({
      code: 'VALIDATION_ERROR',
      message: 'Invalid or expired challenge',
      details: { challengeId },
    } satisfies ApiError)
  }

  // Parse challenge metadata (contains both challenge string and pendingUserId)
  let challengeData: { challenge: string; pendingUserId: string }
  try {
    challengeData = JSON.parse(challengeRecord.challenge)
  } catch {
    return err({
      code: 'INTERNAL',
      message: 'Invalid challenge format',
    } satisfies ApiError)
  }

  // Verify attestation
  const verification = await verifyRegistrationResponse({
    response: attestation,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
  })

  if (!verification.verified) {
    return err({
      code: 'VALIDATION_ERROR',
      message: 'Failed to verify registration',
      details: { verificationError: verification.registrationInfo },
    } satisfies ApiError)
  }

  // Store credential
  const { credential } = verification.registrationInfo ?? {}

  if (!credential) {
    return err({
      code: 'INTERNAL',
      message: 'No credential in verification response',
    } satisfies ApiError)
  }

  // Reuse userId from authRegisterStart for consistency
  const userId = challengeData.pendingUserId

  // Create user record FIRST (required by foreign key constraint)
  await db
    .insertInto('users')
    .values({
      id: userId,
      created_at: nowMs(),
    })
    .onConflict(db => db.doNothing())
    .execute()

  // Now insert the credential (foreign key constraint satisfied)
  await db
    .insertInto('webauthn_credentials')
    .values({
      credential_id: credential.id,
      user_id: userId,
      public_key: uint8ArrayToHex(credential.publicKey),
      counter: credential.counter,
      transports: JSON.stringify(credential.transports || []),
      created_at: nowMs(),
    })
    .execute()

  // Delete challenge
  await db.deleteFrom('auth_challenges').where('id', '=', challengeId).execute()

  // Create session
  const { sessionId, sessionTTLSeconds } = await createSession(db, userId, env)

  // Cleanup expired sessions for this user
  await cleanupExpiredSessions(db, userId)

  return ok({ sessionId, userId: userId, sessionTTLSeconds })
}

// Generate authentication options
export async function authLoginStart(db: ReturnType<typeof getDb>, env: CloudflareEnv) {
  await cleanupExpiredChallenges(db)
  const config = getConfig(env)
  const challengeId = newId()

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: 'preferred',
  })

  // Store challenge
  await db
    .insertInto('auth_challenges')
    .values({
      id: challengeId,
      challenge: options.challenge,
      type: 'authentication',
      user_id: null,
      expires_at: nowMs() + config.challengeTTLMs,
      created_at: nowMs(),
    })
    .execute()

  return ok({ options, challengeId })
}

// Verify authentication response
export async function authLoginFinish(
  db: ReturnType<typeof getDb>,
  assertion: AuthenticationResponseJSON,
  challengeId: string,
  env: CloudflareEnv,
) {
  const config = getConfig(env)
  const now = nowMs()

  // Load challenge
  const challenge = await db
    .selectFrom('auth_challenges')
    .where('id', '=', challengeId)
    .where('type', '=', 'authentication')
    .where('expires_at', '>', now)
    .select(['challenge'])
    .executeTakeFirst()

  if (!challenge) {
    return err({
      code: 'VALIDATION_ERROR',
      message: 'Invalid or expired challenge',
      details: { challengeId },
    } satisfies ApiError)
  }

  // Find credential
  const credentialRecord = await db
    .selectFrom('webauthn_credentials')
    .where('credential_id', '=', assertion.id)
    .select(['credential_id', 'user_id', 'public_key', 'counter', 'transports'])
    .executeTakeFirst()

  if (!credentialRecord) {
    return err({
      code: 'NOT_FOUND',
      message: 'Credential not found',
    } satisfies ApiError)
  }

  // Verify assertion
  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: challenge.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    credential: {
      id: credentialRecord.credential_id,
      publicKey: hexToUint8Array(credentialRecord.public_key),
      counter: credentialRecord.counter,
      transports: JSON.parse(credentialRecord.transports),
    },
  })

  if (!verification.verified) {
    return err({
      code: 'VALIDATION_ERROR',
      message: 'Failed to verify authentication',
      details: { verificationError: verification.authenticationInfo },
    } satisfies ApiError)
  }

  // Update counter
  const { newCounter } = verification.authenticationInfo ?? {}
  if (newCounter !== undefined) {
    await db
      .updateTable('webauthn_credentials')
      .set({ counter: newCounter })
      .where('credential_id', '=', credentialRecord.credential_id)
      .execute()
  }

  // Delete challenge
  await db.deleteFrom('auth_challenges').where('id', '=', challengeId).execute()

  // Create session
  const { sessionId, sessionTTLSeconds } = await createSession(db, credentialRecord.user_id, env)

  // Cleanup expired sessions for this user
  await cleanupExpiredSessions(db, credentialRecord.user_id)

  return ok({ sessionId, userId: credentialRecord.user_id, sessionTTLSeconds })
}

// Logout - revoke session
export async function authLogout(db: ReturnType<typeof getDb>, sessionId: string) {
  await revokeSession(db, sessionId)
  return ok({ success: true })
}

// Get user from session
export async function getUserFromSession(db: ReturnType<typeof getDb>, sessionId: string): Promise<{ userId: string } | null> {
  const userId = await validateSession(db, sessionId)
  if (!userId) {
    return null
  }
  return { userId }
}
