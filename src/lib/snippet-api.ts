import { toast } from 'sonner'
import type { ServerIdMap, Snippet, SnippetData } from '~/lib/local-storage'
import {
  createLocalSnippet,
  deleteLocalSnippet,
  getDeletedFolders,
  getDeletedSnippets,
  getLocalFolder,
  getLocalIdByServerId,
  getLocalSnippet,
  getMeta,
  getServerIdMap,
  getUnsyncedFolders,
  getUnsyncedSnippets,
  isAuthenticated,
  type LocalSnippet,
  listLocalSnippets,
  markAsSynced,
  markFolderAsSynced,
  permanentlyDeleteFolder,
  permanentlyDeleteSnippet,
  renameFolderId,
  renameSnippetId,
  resolveSnippetId,
  saveLocalFolder,
  saveLocalSnippet,
  saveServerIdMap,
  setMeta,
  updateLocalSnippet,
} from '~/lib/local-storage'
import { authMe } from '~/server/auth'
import { folderCreate, folderDelete, folderUpdate } from '~/server/folders'
import { snippetCreate, snippetDelete, snippetGet, snippetsList, snippetUpdate } from '~/server/snippets'

export type { SnippetData }
export { setMeta }

// Raw snippet data from API/local storage - fields can be undefined
export interface PartialSnippet {
  id: string
  body?: string
  tags?: string[]
  folder_id?: string | null
  updated_at?: number
  created_at?: number
  synced?: boolean
}

// Validated snippet with all required fields present
export interface ValidatedSnippet {
  id: string
  body: string
  tags: string[]
  folder_id: string | null
  updated_at: number
  created_at: number
  synced?: boolean
}

// Legacy export for backward compatibility
export type SnippetListItem = PartialSnippet

export interface ApiResult<T> {
  data?: T
  error?: string
}

// Type guard to validate snippet has all required fields
export function isValidSnippet(snippet: PartialSnippet): snippet is ValidatedSnippet {
  return (
    snippet.id !== undefined &&
    snippet.body !== undefined &&
    snippet.tags !== undefined &&
    snippet.updated_at !== undefined &&
    snippet.created_at !== undefined &&
    snippet.folder_id !== undefined
  )
}

// List snippets (unified API)
export async function listSnippets(filters: {
  limit?: number
  query?: string
  tag?: string
  folder_id?: string | null
  sortBy?: 'updated' | 'created' | 'body'
  sortOrder?: 'asc' | 'desc'
}): Promise<ApiResult<SnippetListItem[]>> {
  if (isAuthenticated()) {
    // Server mode: fetch from server
    const result = await snippetsList({
      data: {
        limit: filters.limit || 100,
        query: filters.query,
        tag: filters.tag,
        folder_id: filters.folder_id,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
    })

    if (result.error) {
      // On error, fallback to local
      const local = listLocalSnippets()
      return { data: local.map(toListItem) }
    }

    // Merge server results with local unsynced snippets
    const serverItems: SnippetListItem[] = result.data.items
    const localUnsynced = listLocalSnippets().filter(s => !s.synced)
    const localDeleted = getDeletedSnippets()

    // Build merged list, prioritizing local unsynced snippets
    const merged: SnippetListItem[] = []
    const processedServerIds = new Set<string>()

    // Collect server IDs of locally deleted snippets to exclude them
    const deletedServerIds = new Set<string>()
    for (const deleted of localDeleted) {
      if (deleted.serverId) {
        deletedServerIds.add(deleted.serverId)
      }
    }

    // First, populate processedServerIds from ALL local unsynced snippets
    // This prevents ghost items when a local change excludes a snippet from the filter
    for (const local of localUnsynced) {
      if (local.serverId) {
        processedServerIds.add(local.serverId)
      }
    }

    // Apply filters to local unsynced snippets before adding to merged result
    let filteredLocal = localUnsynced
    if (filters.query) {
      const query = filters.query.toLowerCase()
      filteredLocal = filteredLocal.filter(
        s => (s.body ?? '').toLowerCase().includes(query) || (s.tags ?? []).some(tag => tag.toLowerCase().includes(query)),
      )
    }

    if (filters.tag) {
      const tag = filters.tag
      filteredLocal = filteredLocal.filter(s => (s.tags ?? []).includes(tag))
    }

    if (filters.folder_id !== undefined) {
      filteredLocal = filteredLocal.filter(s => (s.folder_id ?? null) === filters.folder_id)
    }

    // Add filtered local unsynced snippets to merged list
    for (const local of filteredLocal) {
      merged.push(toListItem(local))
    }

    // Then, add server items that weren't overridden by local changes or deletions
    for (const server of serverItems) {
      if (!processedServerIds.has(server.id) && !deletedServerIds.has(server.id)) {
        merged.push(server)
      }
    }

    // Sort the merged list according to user preferences
    const sortColumn = filters.sortBy || 'updated'
    const sortDirection = filters.sortOrder || 'desc'

    merged.sort((a, b) => {
      if (sortColumn === 'body') {
        // Handle undefined body values by sorting them last
        const aBody = a.body ?? ''
        const bBody = b.body ?? ''
        const comparison = aBody.localeCompare(bBody)
        return sortDirection === 'asc' ? comparison : -comparison
      }

      // For created/updated sorting, use timestamp comparison
      const aValue = sortColumn === 'created' ? (a.created_at ?? 0) : (a.updated_at ?? 0)
      const bValue = sortColumn === 'created' ? (b.created_at ?? 0) : (b.updated_at ?? 0)

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    return { data: merged }
  }

  // Local mode: use localStorage
  let local = listLocalSnippets()

  // Apply filters locally
  if (filters.query) {
    const query = filters.query.toLowerCase()
    local = local.filter(s => s.body.toLowerCase().includes(query) || (s.tags ?? []).some(tag => tag.toLowerCase().includes(query)))
  }

  if (filters.tag) {
    const tag = filters.tag
    local = local.filter(s => (s.tags ?? []).includes(tag))
  }

  if (filters.folder_id !== undefined) {
    local = local.filter(s => (s.folder_id ?? null) === filters.folder_id)
  }

  // Apply sorting locally
  if (filters.sortBy === 'body') {
    local.sort((a, b) => {
      // Handle undefined body values by sorting them last
      const aBody = a.body ?? ''
      const bBody = b.body ?? ''
      return filters.sortOrder === 'asc' ? aBody.localeCompare(bBody) : bBody.localeCompare(aBody)
    })
  } else {
    const field = filters.sortBy === 'created' ? 'created_at' : 'updated_at'
    local.sort((a, b) => {
      // Handle undefined timestamps by sorting them last
      const aValue = a[field] ?? 0
      const bValue = b[field] ?? 0
      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })
  }

  // Apply limit
  if (filters.limit) {
    local = local.slice(0, filters.limit)
  }

  return { data: local.map(toListItem) }
}

// Get single snippet
export async function getSnippet(id: string): Promise<ApiResult<Snippet>> {
  // Resolve any ID mappings from sync (prevents zombie snippets)
  const resolvedId = resolveSnippetId(id)

  // Always check local first for unsynced changes
  let local = getLocalSnippet(resolvedId)
  // If not found by local id, try efficient server ID lookup
  if (!local) {
    const localId = getLocalIdByServerId(resolvedId)
    if (localId) {
      local = getLocalSnippet(localId)
    }
  }
  // Fallback to O(N) scan only if both lookups fail (should be rare)
  if (!local) {
    const allLocal = listLocalSnippets()
    local = allLocal.find(s => s.serverId === resolvedId) || null
  }
  const hasLocalUnsynced = local && !local.synced && !local.deleted

  if (isAuthenticated()) {
    // If snippet is marked as deleted locally, return error immediately
    if (local?.deleted) {
      return { error: 'Snippet not found' }
    }

    // If we have local unsynced changes, prefer those
    if (hasLocalUnsynced && local) {
      return { data: fromLocalSnippet(local) }
    }

    // Otherwise fetch from server using resolved ID
    const result = await snippetGet({ data: { id: resolvedId } })

    if (result.error) {
      // Try local as fallback
      if (local && !local.deleted) {
        return { data: fromLocalSnippet(local) }
      }
      return { error: result.error.message }
    }

    return { data: result.data }
  }

  // Local mode
  if (!local || local.deleted) {
    return { error: 'Snippet not found' }
  }

  return { data: fromLocalSnippet(local) }
}

// Create snippet
export async function createSnippet(snippet: SnippetData): Promise<ApiResult<{ id: string }>> {
  if (isAuthenticated()) {
    const result = await snippetCreate({ data: snippet })

    if (result.error) {
      // Fallback to local
      const local = createLocalSnippet(snippet)
      if (!local) {
        return { error: 'Failed to create snippet locally' }
      }
      return { data: { id: local.id } }
    }

    // Trigger automatic background sync after successful create
    triggerAutoSync().catch(err => console.error('Auto-sync failed:', err))

    return { data: result.data }
  }

  // Local mode
  const local = createLocalSnippet(snippet)
  if (!local) {
    return { error: 'Failed to create snippet locally' }
  }
  return { data: { id: local.id } }
}

// Update snippet
export async function updateSnippet(id: string, updates: Partial<SnippetData>): Promise<ApiResult<{ success: boolean }>> {
  // Resolve any ID mappings from sync (prevents zombie snippets)
  const resolvedId = resolveSnippetId(id)

  if (isAuthenticated()) {
    const result = await snippetUpdate({ data: { id: resolvedId, ...updates } })

    if (result.error) {
      // Try local update
      const local = updateLocalSnippet(resolvedId, updates)
      if (local) {
        return { data: { success: true } }
      }
      return { error: result.error.message }
    }

    // Trigger automatic background sync after successful update
    triggerAutoSync().catch(err => console.error('Auto-sync failed:', err))

    return { data: result.data }
  }

  // Local mode
  // Check if snippet exists first to distinguish between "not found" and "save failed"
  const existing = getLocalSnippet(resolvedId)
  if (!existing) {
    return { error: 'Snippet not found' }
  }

  const local = updateLocalSnippet(resolvedId, updates)
  if (!local) {
    return { error: 'Failed to save snippet (storage quota exceeded?)' }
  }

  return { data: { success: true } }
}

// Delete snippet
export async function deleteSnippet(id: string): Promise<ApiResult<{ success: boolean }>> {
  // Resolve any ID mappings from sync (prevents zombie snippets)
  const resolvedId = resolveSnippetId(id)

  if (isAuthenticated()) {
    const result = await snippetDelete({ data: { id: resolvedId } })

    if (result.error) {
      // Try local delete
      const success = deleteLocalSnippet(resolvedId)
      if (success) {
        return { data: { success: true } }
      }
      return { error: result.error.message }
    }

    // Trigger automatic background sync after successful delete
    triggerAutoSync().catch(err => console.error('Auto-sync failed:', err))

    return { data: result.data }
  }

  // Local mode
  const success = deleteLocalSnippet(resolvedId)
  if (!success) {
    return { error: 'Snippet not found' }
  }

  return { data: { success: true } }
}

// Get authentication status
export async function getAuthStatus(): Promise<{ authenticated: boolean; userId?: string }> {
  const result = await authMe({})

  if ('data' in result) {
    if (result.data.userId) {
      return { authenticated: true, userId: result.data.userId }
    }
  }

  return { authenticated: false }
}

// Sync folders to server (must be called before syncing snippets)
async function syncFoldersToServer(): Promise<{
  synced: number
  updated: number
  deleted: number
  errors: number
  skipped: number
  folderIdMap: Map<string, string> // local ID -> server ID
}> {
  const unsynced = getUnsyncedFolders()
  const deleted = getDeletedFolders()
  let synced = 0
  let updated = 0
  let deletedCount = 0
  let errors = 0
  let skipped = 0
  const folderIdMap = new Map<string, string>()

  // Sync new and modified folders
  for (const folder of unsynced) {
    const folderTimestamp = folder.updated_at

    // If folder has a serverId, it's an update, otherwise it's a new folder
    if (folder.serverId) {
      // Update existing folder on server
      // Resolve parent_id: if parent has a server ID, use it; otherwise null
      let serverParentId: string | null = null
      if (folder.parent_id !== undefined && folder.parent_id !== null) {
        const parentFolder = getLocalFolder(folder.parent_id)
        serverParentId = parentFolder?.serverId ?? null
      }

      const result = await folderUpdate({
        data: {
          id: folder.serverId,
          data: {
            name: folder.name,
            color: folder.color,
            icon: folder.icon,
            parent_id: serverParentId,
            position: folder.position,
          },
        },
      })

      if (result.error) {
        errors++
      } else {
        // Only mark as synced if the folder hasn't been modified during the sync request
        const current = getLocalFolder(folder.id)
        if (current && current.updated_at === folderTimestamp) {
          markFolderAsSynced(folder.id)
          updated++
        } else {
          skipped++
        }
      }
    } else {
      // Create new folder on server (position is calculated server-side)
      // Resolve parent_id: if parent has a server ID, use it; otherwise null
      let serverParentId: string | null = null
      if (folder.parent_id !== undefined && folder.parent_id !== null) {
        const parentFolder = getLocalFolder(folder.parent_id)
        serverParentId = parentFolder?.serverId ?? null
      }

      const result = await folderCreate({
        data: {
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          parent_id: serverParentId,
        },
      })

      if (result.error) {
        errors++
      } else if (result.data) {
        const serverId = result.data.folder.id
        // Only rename if the folder hasn't been modified during the sync request
        const current = getLocalFolder(folder.id)
        if (current && current.updated_at === folderTimestamp) {
          if (renameFolderId(folder.id, serverId)) {
            folderIdMap.set(folder.id, serverId)
            synced++
          } else {
            // Rename failed, but at least update the serverId
            const updatedFolder = getLocalFolder(folder.id)
            if (updatedFolder) {
              updatedFolder.serverId = serverId
              updatedFolder.synced = true
              if (!saveLocalFolder(updatedFolder)) {
                errors++
              } else {
                folderIdMap.set(folder.id, serverId)
                synced++
              }
            } else {
              errors++
            }
          }
        } else {
          // Folder was modified during sync
          const updatedFolder = getLocalFolder(folder.id)
          if (updatedFolder) {
            updatedFolder.serverId = serverId
            saveLocalFolder(updatedFolder)
            folderIdMap.set(folder.id, serverId)
          }
          skipped++
        }
      }
    }
  }

  // Sync deletions to server
  for (const folder of deleted) {
    if (folder.serverId) {
      const result = await folderDelete({
        data: { id: folder.serverId },
      })

      if (result.error) {
        errors++
      } else {
        permanentlyDeleteFolder(folder.id)
        deletedCount++
      }
    } else {
      permanentlyDeleteFolder(folder.id)
      deletedCount++
    }
  }

  return { synced, updated, deleted: deletedCount, errors, skipped, folderIdMap }
}

// Sync to server
export async function syncToServer(): Promise<{
  synced: number
  updated: number
  deleted: number
  errors: number
  skipped: number
}> {
  // Sync folders first (snippets depend on folders existing)
  const folderResult = await syncFoldersToServer()
  const folderIdMap = folderResult.folderIdMap

  const unsynced = getUnsyncedSnippets()
  const deleted = getDeletedSnippets()
  let synced = 0
  let updated = 0
  let deletedCount = 0
  let errors = folderResult.errors
  let skipped = folderResult.skipped

  // Batch server ID map updates for performance
  const serverIdMapUpdates: ServerIdMap = {}

  // Sync new and modified snippets
  for (const snippet of unsynced) {
    // Capture the timestamp BEFORE the sync request to detect race conditions
    const snippetTimestamp = snippet.updated_at

    // If snippet has a serverId, it's an update, otherwise it's a new snippet
    if (snippet.serverId) {
      // Update existing snippet on server
      const updateData: { body: string; tags: string[]; folder_id?: string | null } = {
        body: snippet.body,
        tags: snippet.tags ?? [],
      }

      // Map local folder_id to server folder_id if it exists
      if (snippet.folder_id !== undefined) {
        if (snippet.folder_id === null) {
          updateData.folder_id = null
        } else {
          // Check if folder was just synced (has new ID in map)
          const serverFolderId = folderIdMap.get(snippet.folder_id)
          if (serverFolderId) {
            updateData.folder_id = serverFolderId
          } else {
            // Check if folder has an existing server ID
            const folder = getLocalFolder(snippet.folder_id)
            if (folder?.serverId) {
              updateData.folder_id = folder.serverId
            } else {
              // Folder not synced yet, set to null
              updateData.folder_id = null
            }
          }
        }
      }

      const result = await snippetUpdate({
        data: {
          id: snippet.serverId,
          ...updateData,
        },
      })

      if (result.error) {
        errors++
      } else {
        // Only mark as synced if the snippet hasn't been modified during the sync request
        const current = getLocalSnippet(snippet.id)
        if (current && current.updated_at === snippetTimestamp) {
          markAsSynced(snippet.id)
          updated++
        } else {
          // Snippet was modified during sync, leave it as unsynced (not an error)
          skipped++
        }
      }
    } else {
      // Create new snippet on server
      const createData: { body: string; tags: string[]; folder_id?: string | null } = {
        body: snippet.body,
        tags: snippet.tags ?? [],
      }

      // Map local folder_id to server folder_id if it exists
      if (snippet.folder_id !== undefined) {
        if (snippet.folder_id === null) {
          createData.folder_id = null
        } else {
          // Check if folder has a server ID
          const serverFolderId = folderIdMap.get(snippet.folder_id)
          if (serverFolderId) {
            createData.folder_id = serverFolderId
          } else {
            // Folder not synced yet, check if it has an existing server ID
            const folder = getLocalFolder(snippet.folder_id)
            if (folder?.serverId) {
              createData.folder_id = folder.serverId
            } else {
              // Folder not synced, set to null
              createData.folder_id = null
            }
          }
        }
      }

      const result = await snippetCreate({
        data: createData,
      })

      if (result.error) {
        errors++
      } else if (result.data) {
        // Update local snippet with server ID
        const serverId = result.data.id
        // Only rename if the snippet hasn't been modified during the sync request
        const current = getLocalSnippet(snippet.id)
        if (current && current.updated_at === snippetTimestamp) {
          if (renameSnippetId(snippet.id, serverId)) {
            synced++
          } else {
            // Rename failed, but at least update the serverId to prevent duplicate creates
            const updatedSnippet = getLocalSnippet(snippet.id)
            if (updatedSnippet) {
              updatedSnippet.serverId = serverId
              updatedSnippet.synced = true
              if (!saveLocalSnippet(updatedSnippet)) {
                // Saving failed - count as error to prevent duplicate sync
                errors++
              } else {
                // Collect server ID mapping for batch update
                serverIdMapUpdates[serverId] = snippet.id
                synced++
              }
            } else {
              errors++
            }
          }
        } else {
          // Snippet was modified during sync, just update serverId to prevent duplicate (not an error)
          const updatedSnippet = getLocalSnippet(snippet.id)
          if (updatedSnippet) {
            updatedSnippet.serverId = serverId
            saveLocalSnippet(updatedSnippet)
            // Collect server ID mapping for batch update
            serverIdMapUpdates[serverId] = snippet.id
          }
          skipped++
        }
      }
    }
  }

  // Sync deletions to server
  for (const snippet of deleted) {
    if (snippet.serverId) {
      // Delete from server
      const result = await snippetDelete({
        data: { id: snippet.serverId },
      })

      if (result.error) {
        errors++
      } else {
        // Permanently delete from local storage
        permanentlyDeleteSnippet(snippet.id)
        deletedCount++
      }
    } else {
      // Never synced to server, just delete locally
      permanentlyDeleteSnippet(snippet.id)
      deletedCount++
    }
  }

  // Batch update server ID map for better performance
  if (Object.keys(serverIdMapUpdates).length > 0) {
    const existingMap = getServerIdMap()
    const mergedMap = { ...existingMap, ...serverIdMapUpdates }
    saveServerIdMap(mergedMap)
  }

  if (synced > 0 || updated > 0 || deletedCount > 0) {
    setMeta({ lastSyncAt: Date.now() })
  }

  return { synced, updated, deleted: deletedCount, errors, skipped }
}

// Auto-sync timer to prevent excessive sync calls
let autoSyncTimer: ReturnType<typeof setTimeout> | null = null
let autoSyncScheduled = false

// Trigger automatic background sync (debounced to prevent excessive calls)
async function triggerAutoSync(): Promise<void> {
  // Only sync if authenticated
  if (!isAuthenticated()) {
    return
  }

  // Clear any existing timer
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer)
  }

  // If already scheduled, don't schedule again
  if (autoSyncScheduled) {
    return
  }

  // Schedule sync after a short delay (3 seconds) to batch rapid changes
  autoSyncScheduled = true

  autoSyncTimer = setTimeout(async () => {
    try {
      const result = await syncToServer()

      // Only show toast if there were actual changes
      if (result.synced > 0 || result.updated > 0 || result.deleted > 0) {
        const totalChanges = result.synced + result.updated + result.deleted
        if (result.errors > 0) {
          toast.warning(
            `Synced ${totalChanges} item${totalChanges !== 1 ? 's' : ''} (${result.errors} error${result.errors !== 1 ? 's' : ''})`,
          )
        } else {
          toast.success(`Synced ${totalChanges} item${totalChanges !== 1 ? 's' : ''} automatically`)
        }
      }
    } catch (error) {
      console.error('Auto-sync failed:', error)
    } finally {
      autoSyncScheduled = false
      autoSyncTimer = null
    }
  }, 3000)
}

// Convert local snippet to server format
function fromLocalSnippet(local: LocalSnippet): Snippet {
  return {
    id: local.id,
    user_id: getMeta().userId || '',
    body: local.body,
    tags: local.tags ?? [],
    folder_id: local.folder_id ?? null,
    created_at: local.created_at,
    updated_at: local.updated_at,
  }
}

// Convert to list item format (returns PartialSnippet since data might be incomplete)
function toListItem(local: LocalSnippet): PartialSnippet {
  return {
    id: local.id,
    body: local.body,
    tags: local.tags ?? [],
    folder_id: local.folder_id ?? null,
    updated_at: local.updated_at,
    created_at: local.created_at,
    synced: local.synced,
  }
}
