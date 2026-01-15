export interface Database {
	users: UsersTable
	webauthn_credentials: WebAuthnCredentialsTable
	auth_challenges: AuthChallengesTable
	sessions: SessionsTable
	snippets: SnippetsTable
}

export interface UsersTable {
	id: string
	created_at: number
}

export interface WebAuthnCredentialsTable {
	credential_id: string
	user_id: string
	public_key: string
	counter: number
	transports: string
	created_at: number
}

export interface AuthChallengesTable {
	id: string
	challenge: string
	type: 'registration' | 'authentication'
	user_id: string | null
	expires_at: number
	created_at: number
}

export interface SessionsTable {
	id: string
	user_id: string
	created_at: number
	expires_at: number
	revoked_at: number | null
}

export interface SnippetsTable {
	id: string
	user_id: string
	title: string
	body: string
	tags: string
	created_at: number
	updated_at: number
}
