// Snippet type matching the database structure
export interface Snippet {
  id: string
  user_id: string
  body: string
  tags: string[]
  folder_id: string | null
  created_at: number
  updated_at: number
}

// Snippet data without user_id (for local creation)
export interface SnippetData {
  body: string
  tags: string[]
  folder_id?: string | null
}

const STORAGE_PREFIX = 'snippet_'
const META_KEY = 'snipkey_meta'
const ID_MAP_KEY = 'snipkey_id_map'
const SERVER_ID_MAP_KEY = 'snipkey_server_id_map'

export interface LocalSnippet extends Omit<Snippet, 'folder_id'> {
  folder_id?: string | null
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
    // Metadata corrupted, return defaults (safe to ignore - will be recreated)
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

export function createLocalSnippet(snippet: SnippetData): LocalSnippet | null {
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

  // Check if save succeeded - if not, return null to indicate failure
  if (!saveLocalSnippet(localSnippet)) {
    return null
  }

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

  // Check if save succeeded - if not, return null to indicate failure
  if (!saveLocalSnippet(updated)) {
    return null
  }

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

  return saveLocalSnippet(deleted)
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

    // Note: No server ID mapping needed here since newId equals serverId
    // The getSnippet logic handles this naturally via direct lookup

    // Only remove old key after new key is saved AND mapping is successful
    localStorage.removeItem(oldKey)

    // If removal failed, accept the duplication rather than risking data loss
    // The new key is accessible via the ID mapping, so this is safe
    // Verification removed to prevent dangerous rollback that could orphan data

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

// Server ID mapping for efficient reverse lookups (serverId -> localId)
export interface ServerIdMap {
  [serverId: string]: string // Maps server ID to local ID
}

export function getServerIdMap(): ServerIdMap {
  if (typeof window === 'undefined') return {}

  const stored = localStorage.getItem(SERVER_ID_MAP_KEY)
  if (!stored) return {}

  try {
    return JSON.parse(stored) as ServerIdMap
  } catch {
    return {}
  }
}

export function saveServerIdMap(map: ServerIdMap): boolean {
  if (typeof window === 'undefined') return false

  try {
    localStorage.setItem(SERVER_ID_MAP_KEY, JSON.stringify(map))
    return true
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('Local storage quota exceeded, unable to save server ID map')
    } else {
      console.error('Failed to save server ID map to local storage:', error)
    }
    return false
  }
}

export function addServerIdMapping(localId: string, serverId: string): boolean {
  const map = getServerIdMap()
  map[serverId] = localId
  return saveServerIdMap(map)
}

export function getLocalIdByServerId(serverId: string): string | null {
  const map = getServerIdMap()
  return map[serverId] || null
}

export function clearServerIdMap(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(SERVER_ID_MAP_KEY)
}

// ============================================================================
// FOLDER LOCAL STORAGE
// ============================================================================

const FOLDER_PREFIX = 'folder_'

export interface Folder {
  id: string
  user_id: string
  parent_id: string | null
  name: string
  color: string
  icon: string
  created_at: number
  updated_at: number
  position: number
}

export interface LocalFolder extends Omit<Folder, 'parent_id'> {
  parent_id?: string | null
  synced: boolean
  deleted: boolean
  serverId?: string
}

function getFolderKey(id: string): string {
  return `${FOLDER_PREFIX}${id}`
}

export function listLocalFolders(): LocalFolder[] {
  if (typeof window === 'undefined') return []

  const folders: LocalFolder[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(FOLDER_PREFIX)) continue

    try {
      const data = localStorage.getItem(key)
      if (!data) continue

      const folder = JSON.parse(data) as LocalFolder
      if (folder.deleted) continue

      folders.push(folder)
    } catch {}
  }

  return folders.sort((a, b) => a.position - b.position)
}

export function getLocalFolder(id: string): LocalFolder | null {
  if (typeof window === 'undefined') return null

  const key = getFolderKey(id)
  const data = localStorage.getItem(key)

  if (!data) return null

  try {
    return JSON.parse(data) as LocalFolder
  } catch {
    return null
  }
}

export function createLocalFolder(folder: Omit<Folder, 'id' | 'user_id' | 'created_at' | 'updated_at'>): LocalFolder | null {
  const now = Date.now()
  const id = crypto.randomUUID()
  const meta = getMeta()

  const localFolder: LocalFolder = {
    id,
    user_id: meta.userId || '',
    ...folder,
    created_at: now,
    updated_at: now,
    synced: false,
    deleted: false,
  }

  if (!saveLocalFolder(localFolder)) {
    return null
  }

  return localFolder
}

export function updateLocalFolder(
  id: string,
  updates: Partial<Omit<Folder, 'id' | 'created_at' | 'updated_at' | 'user_id'>>,
): LocalFolder | null {
  const existing = getLocalFolder(id)
  if (!existing) return null

  const updated: LocalFolder = {
    ...existing,
    ...updates,
    updated_at: Date.now(),
    synced: false,
  }

  if (!saveLocalFolder(updated)) {
    return null
  }

  return updated
}

export function deleteLocalFolder(id: string): boolean {
  const existing = getLocalFolder(id)
  if (!existing) return false

  const deleted: LocalFolder = {
    ...existing,
    deleted: true,
    synced: false,
    updated_at: Date.now(),
  }

  return saveLocalFolder(deleted)
}

export function saveLocalFolder(folder: LocalFolder): boolean {
  if (typeof window === 'undefined') return false

  const key = getFolderKey(folder.id)
  try {
    localStorage.setItem(key, JSON.stringify(folder))
    return true
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.error('Local storage quota exceeded, unable to save folder')
    } else {
      console.error('Failed to save folder to local storage:', error)
    }
    return false
  }
}

export function markFolderAsSynced(id: string): void {
  const existing = getLocalFolder(id)
  if (!existing) return

  existing.synced = true
  saveLocalFolder(existing)
}

export function getUnsyncedFolders(): LocalFolder[] {
  const folders = listLocalFolders()
  return folders.filter(f => !f.synced && !f.deleted)
}

export function getDeletedFolders(): LocalFolder[] {
  if (typeof window === 'undefined') return []

  const folders: LocalFolder[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(FOLDER_PREFIX)) continue

    try {
      const data = localStorage.getItem(key)
      if (!data) continue

      const folder = JSON.parse(data) as LocalFolder
      if (folder.deleted && !folder.synced) {
        folders.push(folder)
      }
    } catch {}
  }

  return folders
}

export function renameFolderId(oldId: string, newId: string): boolean {
  if (typeof window === 'undefined') return false

  const oldKey = getFolderKey(oldId)
  const data = localStorage.getItem(oldKey)

  if (!data) return false

  try {
    const folder = JSON.parse(data) as LocalFolder
    folder.id = newId
    folder.serverId = newId
    folder.synced = true

    const newKey = getFolderKey(newId)
    const newData = JSON.stringify(folder)

    localStorage.setItem(newKey, newData)
    localStorage.removeItem(oldKey)

    // Update all child folders that have this folder as parent
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(FOLDER_PREFIX)) continue

      try {
        const folderData = localStorage.getItem(key)
        if (!folderData) continue

        const childFolder = JSON.parse(folderData) as LocalFolder
        if (childFolder.parent_id === oldId) {
          childFolder.parent_id = newId
          childFolder.synced = false // Mark as unsynced so it gets updated on server
          localStorage.setItem(key, JSON.stringify(childFolder))
        }
      } catch {}
    }

    // Update all snippets that reference this folder
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue

      try {
        const snippetData = localStorage.getItem(key)
        if (!snippetData) continue

        const snippet = JSON.parse(snippetData) as LocalSnippet
        if (snippet.folder_id === oldId) {
          snippet.folder_id = newId
          snippet.synced = false // Mark as unsynced so it gets updated on server
          localStorage.setItem(key, JSON.stringify(snippet))
        }
      } catch {}
    }

    return true
  } catch {
    return false
  }
}

export function permanentlyDeleteFolder(id: string): boolean {
  if (typeof window === 'undefined') return false

  const key = getFolderKey(id)
  const exists = localStorage.getItem(key)

  if (!exists) return false

  localStorage.removeItem(key)
  return true
}

export function clearLocalFolders(): void {
  if (typeof window === 'undefined') return

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(FOLDER_PREFIX)) continue
    keys.push(key)
  }

  for (const key of keys) {
    localStorage.removeItem(key)
  }
}

// Get local folder by server ID (for sync)
export function getLocalFolderByServerId(serverId: string): LocalFolder | null {
  const folders = listLocalFolders()
  return folders.find(f => f.serverId === serverId) || null
}

// Get server ID by local folder ID (for sync)
export function getServerFolderId(localId: string): string | null {
  const folder = getLocalFolder(localId)
  return folder?.serverId || null
}
