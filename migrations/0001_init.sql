-- Migration number: 0001 	 2026-01-20T00:00:00.000Z
-- Initial database schema for Snipkey

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

-- Folders table for organizing snippets
CREATE TABLE folders (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	parent_id TEXT,
	name TEXT NOT NULL,
	color TEXT NOT NULL DEFAULT 'gray',
	icon TEXT NOT NULL DEFAULT 'Folder',
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	position INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Snippets table (without title, with folder support)
CREATE TABLE snippets (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	body TEXT NOT NULL,
	tags TEXT NOT NULL,
	folder_id TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX snippets_user_updated ON snippets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS snippets_folder ON snippets(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX creds_user ON webauthn_credentials(user_id);
CREATE INDEX sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX challenges_expires ON auth_challenges(expires_at);
CREATE INDEX folders_user_parent_position ON folders(user_id, parent_id, position);
CREATE INDEX folders_user_updated ON folders(user_id, updated_at DESC);
