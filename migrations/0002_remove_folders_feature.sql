-- Migration number: 0002 	 2026-01-20T23:01:03.144Z
-- Remove folders feature

-- Drop folder-related indexes
DROP INDEX IF EXISTS snippets_folder;
DROP INDEX IF EXISTS folders_user_parent_position;
DROP INDEX IF EXISTS folders_user_updated;

-- Drop folders table
DROP TABLE IF EXISTS folders;

-- Remove folder_id column from snippets
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
CREATE TABLE snippets_new (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	body TEXT NOT NULL,
	tags TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table to new table (without folder_id)
INSERT INTO snippets_new (id, user_id, body, tags, created_at, updated_at)
SELECT id, user_id, body, tags, created_at, updated_at FROM snippets;

-- Drop old table
DROP TABLE snippets;

-- Rename new table
ALTER TABLE snippets_new RENAME TO snippets;

-- Recreate indexes
CREATE INDEX snippets_user_updated ON snippets(user_id, updated_at DESC);
