-- Users table
CREATE TABLE users (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL
);

-- WebAuthn credentials table
CREATE TABLE webauthn_credentials (
	credential_id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	public_key TEXT NOT NULL,
	counter INTEGER NOT NULL,
	transports TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Authentication challenges table
CREATE TABLE auth_challenges (
	id TEXT PRIMARY KEY,
	challenge TEXT NOT NULL,
	type TEXT NOT NULL,
	user_id TEXT,
	expires_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	revoked_at INTEGER,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Snippets table
CREATE TABLE snippets (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	tags TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX snippets_user_updated ON snippets(user_id, updated_at DESC);
CREATE INDEX creds_user ON webauthn_credentials(user_id);
CREATE INDEX sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX challenges_expires ON auth_challenges(expires_at);
