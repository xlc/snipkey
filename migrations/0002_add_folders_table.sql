-- Migration number: 0002 	2026-01-17 00:27:05.837Z

-- Folders table for organizing snippets
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  parent_id TEXT,  -- NULL for root folders
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  icon TEXT NOT NULL DEFAULT 'Folder',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS folders_user_parent_position ON folders(user_id, parent_id, position);
CREATE INDEX IF NOT EXISTS folders_user_updated ON folders(user_id, updated_at DESC);

-- Add folder_id to snippets table
ALTER TABLE snippets ADD COLUMN folder_id TEXT;

-- Create index for folder-based queries
CREATE INDEX IF NOT EXISTS snippets_folder ON snippets(folder_id) WHERE folder_id IS NOT NULL;
