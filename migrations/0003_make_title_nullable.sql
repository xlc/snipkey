-- Migration number: 0003 	 2026-01-18T20:25:05.851Z

-- Make title nullable by recreating the table (SQLite limitation)
CREATE TABLE snippets_new (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	title TEXT,
	body TEXT NOT NULL,
	tags TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO snippets_new (id, user_id, title, body, tags, created_at, updated_at)
SELECT id, user_id, title, body, tags, created_at, updated_at FROM snippets;

-- Drop old table and rename new table
DROP TABLE snippets;
ALTER TABLE snippets_new RENAME TO snippets;

-- Recreate indexes
CREATE INDEX snippets_user_updated ON snippets(user_id, updated_at DESC);
