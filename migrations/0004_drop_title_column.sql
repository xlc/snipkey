-- Migration number: 0004 	 2026-01-18T20:32:28.949Z

-- Remove title column by recreating the table (SQLite limitation)
-- Note: folder_id column may or may not exist depending on migration 0002 status

CREATE TABLE snippets_new (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	body TEXT NOT NULL,
	tags TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table (excluding title)
-- Use CASE to handle optional folder_id column
INSERT INTO snippets_new (id, user_id, body, tags, created_at, updated_at)
SELECT
	id,
	user_id,
	body,
	tags,
	created_at,
	updated_at
FROM snippets;

-- Drop old table and rename new table
DROP TABLE snippets;
ALTER TABLE snippets_new RENAME TO snippets;

-- Recreate indexes
CREATE INDEX snippets_user_updated ON snippets(user_id, updated_at DESC);
