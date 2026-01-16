// Snippet type matching the database structure
export interface Snippet {
  id: string
  user_id: string
  title: string
  body: string
  tags: string[]
  created_at: number
  updated_at: number
}

// Snippet data without user_id (for local creation)
export interface SnippetData {
  title: string
  body: string
  tags: string[]
}

const STORAGE_PREFIX = 'snippet_'
const META_KEY = 'snipkey_meta'

export interface LocalSnippet extends Snippet {
  synced: boolean
  deleted: boolean
}

export interface Meta {
  userId: string | null
  lastSyncAt: number | null
  mode: 'local' | 'cloud'
}

function getSnippetKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

export function getMeta(): Meta {
  const defaultMeta: Meta = {
    userId: null,
    lastSyncAt: null,
    mode: 'local',
  }

  if (typeof window === 'undefined') return defaultMeta

  const stored = localStorage.getItem(META_KEY)
  if (!stored) return defaultMeta

  try {
    return { ...defaultMeta, ...JSON.parse(stored) }
  } catch {
    return defaultMeta
  }
}

export function setMeta(meta: Partial<Meta>): void {
  if (typeof window === 'undefined') return

  const current = getMeta()
  const updated = { ...current, ...meta }
  localStorage.setItem(META_KEY, JSON.stringify(updated))
}

export function isAuthenticated(): boolean {
  const meta = getMeta()
  return meta.userId !== null
}

export function listLocalSnippets(): LocalSnippet[] {
  if (typeof window === 'undefined') return []

  const snippets: LocalSnippet[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue

    try {
      const data = localStorage.getItem(key)
      if (!data) continue

      const snippet = JSON.parse(data) as LocalSnippet
      // Skip soft-deleted snippets
      if (snippet.deleted) continue

      snippets.push(snippet)
    } catch {}
  }

  return snippets.sort((a, b) => b.updated_at - a.updated_at)
}

export function getLocalSnippet(id: string): LocalSnippet | null {
  if (typeof window === 'undefined') return null

  const key = getSnippetKey(id)
  const data = localStorage.getItem(key)

  if (!data) return null

  try {
    return JSON.parse(data) as LocalSnippet
  } catch {
    return null
  }
}

export function createLocalSnippet(snippet: SnippetData): LocalSnippet {
  const now = Date.now()
  const id = crypto.randomUUID()
  const meta = getMeta()

  const localSnippet: LocalSnippet = {
    id,
    user_id: meta.userId || '',
    ...snippet,
    created_at: now,
    updated_at: now,
    synced: false,
    deleted: false,
  }

  saveLocalSnippet(localSnippet)
  return localSnippet
}

export function updateLocalSnippet(
  id: string,
  updates: Partial<Omit<Snippet, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
): LocalSnippet | null {
  const existing = getLocalSnippet(id)
  if (!existing) return null

  const updated: LocalSnippet = {
    ...existing,
    ...updates,
    updated_at: Date.now(),
    synced: false,
  }

  saveLocalSnippet(updated)
  return updated
}

export function deleteLocalSnippet(id: string): boolean {
  const existing = getLocalSnippet(id)
  if (!existing) return false

  // Soft delete for sync purposes
  const deleted: LocalSnippet = {
    ...existing,
    deleted: true,
    synced: false,
    updated_at: Date.now(),
  }

  saveLocalSnippet(deleted)
  return true
}

export function saveLocalSnippet(snippet: LocalSnippet): void {
  if (typeof window === 'undefined') return

  const key = getSnippetKey(snippet.id)
  localStorage.setItem(key, JSON.stringify(snippet))
}

export function markAsSynced(id: string): void {
  const existing = getLocalSnippet(id)
  if (!existing) return

  existing.synced = true
  saveLocalSnippet(existing)
}

export function getUnsyncedSnippets(): LocalSnippet[] {
  const snippets = listLocalSnippets()
  return snippets.filter(s => !s.synced && !s.deleted)
}

export function clearLocalSnippets(): void {
  if (typeof window === 'undefined') return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    keys.push(key)
  }

  for (const key of keys) {
    localStorage.removeItem(key)
  }
}
