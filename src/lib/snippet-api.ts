import type { Snippet, SnippetData } from '~/lib/local-storage'
import {
  createLocalSnippet,
  deleteLocalSnippet,
  getDeletedSnippets,
  getLocalSnippet,
  getMeta,
  getUnsyncedSnippets,
  isAuthenticated,
  type LocalSnippet,
  listLocalSnippets,
  markAsSynced,
  permanentlyDeleteSnippet,
  renameSnippetId,
  resolveSnippetId,
  saveLocalSnippet,
  setMeta,
  updateLocalSnippet,
} from '~/lib/local-storage'
import { authMe } from '~/server/auth'
import { snippetCreate, snippetDelete, snippetGet, snippetsList, snippetUpdate } from '~/server/snippets'

export type { SnippetData }
export { setMeta }

export interface SnippetListItem {
  id: string
  title: string
  body: string
  tags: string[]
  updated_at: number
  created_at?: number
  synced?: boolean
}

export interface ApiResult<T> {
  data?: T
  error?: string
}

// List snippets (unified API)
export async function listSnippets(filters: {
  limit?: number
  query?: string
  tag?: string
  sortBy?: 'updated' | 'created' | 'title'
  sortOrder?: 'asc' | 'desc'
}): Promise<ApiResult<SnippetListItem[]>> {
  if (isAuthenticated()) {
    // Server mode: fetch from server
    const result = await snippetsList({
      data: {
        limit: filters.limit || 100,
        query: filters.query,
        tag: filters.tag,
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

    // First, add all local unsynced snippets
    for (const local of localUnsynced) {
      merged.push(toListItem(local))
      if (local.serverId) {
        processedServerIds.add(local.serverId)
      }
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
      if (sortColumn === 'title') {
        // For title sorting, use string comparison
        const comparison = a.title.localeCompare(b.title)
        return sortDirection === 'asc' ? comparison : -comparison
      }

      // For created/updated sorting, use timestamp comparison
      const aValue = sortColumn === 'created' ? a.created_at || 0 : a.updated_at
      const bValue = sortColumn === 'created' ? b.created_at || 0 : b.updated_at

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    return { data: merged }
  }

  // Local mode: use localStorage
  let local = listLocalSnippets()

  // Apply filters locally
  if (filters.query) {
    const query = filters.query.toLowerCase()
    local = local.filter(
      s =>
        s.title.toLowerCase().includes(query) ||
        s.body.toLowerCase().includes(query) ||
        s.tags.some(tag => tag.toLowerCase().includes(query)),
    )
  }

  if (filters.tag) {
    const tag = filters.tag
    local = local.filter(s => s.tags.includes(tag))
  }

  // Apply sorting locally
  if (filters.sortBy === 'title') {
    local.sort((a, b) => (filters.sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)))
  } else {
    const field = filters.sortBy === 'created' ? 'created_at' : 'updated_at'
    local.sort((a, b) => (filters.sortOrder === 'asc' ? a[field] - b[field] : b[field] - a[field]))
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
  // If not found by local id, try finding by serverId
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
      return { data: { id: local.id } }
    }

    return { data: result.data }
  }

  // Local mode
  const local = createLocalSnippet(snippet)
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

    return { data: result.data }
  }

  // Local mode
  const local = updateLocalSnippet(resolvedId, updates)
  if (!local) {
    return { error: 'Snippet not found' }
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

// Sync to server
export async function syncToServer(): Promise<{ synced: number; updated: number; deleted: number; errors: number }> {
  const unsynced = getUnsyncedSnippets()
  const deleted = getDeletedSnippets()
  let synced = 0
  let updated = 0
  let deletedCount = 0
  let errors = 0

  // Sync new and modified snippets
  for (const snippet of unsynced) {
    // Capture the timestamp BEFORE the sync request to detect race conditions
    const snippetTimestamp = snippet.updated_at

    // If snippet has a serverId, it's an update, otherwise it's a new snippet
    if (snippet.serverId) {
      // Update existing snippet on server
      const result = await snippetUpdate({
        data: {
          id: snippet.serverId,
          title: snippet.title,
          body: snippet.body,
          tags: snippet.tags,
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
          // Snippet was modified during sync, leave it as unsynced
          errors++
        }
      }
    } else {
      // Create new snippet on server
      const result = await snippetCreate({
        data: {
          title: snippet.title,
          body: snippet.body,
          tags: snippet.tags,
        },
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
                synced++
              }
            } else {
              errors++
            }
          }
        } else {
          // Snippet was modified during sync, just update serverId to prevent duplicate
          const updatedSnippet = getLocalSnippet(snippet.id)
          if (updatedSnippet) {
            updatedSnippet.serverId = serverId
            saveLocalSnippet(updatedSnippet)
          }
          errors++
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

  if (synced > 0 || updated > 0 || deletedCount > 0) {
    setMeta({ lastSyncAt: Date.now() })
  }

  return { synced, updated, deleted: deletedCount, errors }
}

// Convert local snippet to server format
function fromLocalSnippet(local: LocalSnippet): Snippet {
  return {
    id: local.id,
    user_id: getMeta().userId || '',
    title: local.title,
    body: local.body,
    tags: local.tags,
    created_at: local.created_at,
    updated_at: local.updated_at,
  }
}

// Convert to list item format
function toListItem(local: LocalSnippet): SnippetListItem {
  return {
    id: local.id,
    title: local.title,
    body: local.body,
    tags: local.tags,
    updated_at: local.updated_at,
    created_at: local.created_at,
    synced: local.synced,
  }
}
