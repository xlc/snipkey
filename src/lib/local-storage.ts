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
const ID_MAP_KEY = 'snipkey_id_map'

export interface LocalSnippet extends Snippet {
  synced: boolean
  deleted: boolean
  serverId?: string // Track server ID after sync
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

export function saveLocalSnippet(snippet: LocalSnippet): boolean {
  if (typeof window === 'undefined') return false

  const key = getSnippetKey(snippet.id)
  try {
    localStorage.setItem(key, JSON.stringify(snippet))
    return true
  } catch (error) {
    // Handle quota exceeded or other localStorage errors
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('Local storage quota exceeded, unable to save snippet')
    } else {
      console.error('Failed to save snippet to local storage:', error)
    }
    return false
  }
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

export function getDeletedSnippets(): LocalSnippet[] {
  if (typeof window === 'undefined') return []

  const snippets: LocalSnippet[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue

    try {
      const data = localStorage.getItem(key)
      if (!data) continue

      const snippet = JSON.parse(data) as LocalSnippet
      // Only include deleted snippets that haven't been synced
      if (snippet.deleted && !snippet.synced) {
        snippets.push(snippet)
      }
    } catch {}
  }

  return snippets
}

export function renameSnippetId(oldId: string, newId: string): boolean {
  if (typeof window === 'undefined') return false

  const oldKey = getSnippetKey(oldId)
  const data = localStorage.getItem(oldKey)

  if (!data) return false

  try {
    // Parse and update snippet
    const snippet = JSON.parse(data) as LocalSnippet
    snippet.id = newId
    snippet.serverId = newId // Track server ID
    snippet.synced = true

    const newKey = getSnippetKey(newId)
    const newData = JSON.stringify(snippet)

    // Save new key FIRST (safer - won't lose data if this fails)
    localStorage.setItem(newKey, newData)

    // Add ID mapping to prevent zombie snippets
    // Perform BEFORE removing old key to prevent data loss if mapping fails
    if (!addIdMapping(oldId, newId)) {
      // Mapping failed - remove the new key we just created
      localStorage.removeItem(newKey)
      return false
    }

    // Only remove old key after new key is saved AND mapping is successful
    localStorage.removeItem(oldKey)

    // Verify the old key was actually removed (prevent local duplication)
    if (localStorage.getItem(oldKey) !== null) {
      // Removal failed - attempt to clean up by removing the new key and mapping
      localStorage.removeItem(newKey)
      // Attempt to remove the ID mapping as well
      const map = getIdMap()
      delete map[oldId]
      saveIdMap(map)
      return false
    }

    return true
  } catch {
    return false
  }
}

export function permanentlyDeleteSnippet(id: string): boolean {
  if (typeof window === 'undefined') return false

  const key = getSnippetKey(id)
  const exists = localStorage.getItem(key)

  if (!exists) return false

  localStorage.removeItem(key)
  return true
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

// ID mapping to handle renames during sync (prevents zombie snippets)
export interface IdMap {
  [oldId: string]: string // Maps old ID to new ID
}

export function getIdMap(): IdMap {
  if (typeof window === 'undefined') return {}

  const stored = localStorage.getItem(ID_MAP_KEY)
  if (!stored) return {}

  try {
    return JSON.parse(stored) as IdMap
  } catch {
    return {}
  }
}

export function saveIdMap(map: IdMap): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(ID_MAP_KEY, JSON.stringify(map))
    return true
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('Local storage quota exceeded, unable to save ID map')
    } else {
      console.error('Failed to save ID map to local storage:', error)
    }
    return false
  }
}

export function addIdMapping(oldId: string, newId: string): boolean {
  const map = getIdMap()
  map[oldId] = newId
  return saveIdMap(map)
}

export function resolveSnippetId(id: string): string {
  const map = getIdMap()

  // Check if this ID has been remapped
  if (id in map) {
    const newId = map[id]
    if (newId) {
      return newId
    }
  }

  return id
}

export function clearIdMap(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(ID_MAP_KEY)
}
