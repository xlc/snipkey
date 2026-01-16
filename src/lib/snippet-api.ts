import type { Snippet, SnippetData } from '~/lib/local-storage'
import {
  createLocalSnippet,
  deleteLocalSnippet,
  getLocalSnippet,
  getMeta,
  getUnsyncedSnippets,
  isAuthenticated,
  type LocalSnippet,
  listLocalSnippets,
  markAsSynced,
  setMeta,
  updateLocalSnippet,
} from '~/lib/local-storage'
import { authMe } from '~/server/auth'
import { snippetCreate, snippetDelete, snippetGet, snippetsList, snippetUpdate } from '~/server/snippets'

export type { SnippetData }

export interface SnippetListItem {
  id: string
  title: string
  body: string
  tags: string[]
  updated_at: number
  created_at: number
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

    return { data: result.data.items }
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
  if (isAuthenticated()) {
    const result = await snippetGet({ data: { id } })

    if (result.error) {
      // Try local as fallback
      const local = getLocalSnippet(id)
      if (local && !local.deleted) {
        return { data: fromLocalSnippet(local) }
      }
      return { error: result.error.message }
    }

    return { data: result.data }
  }

  // Local mode
  const local = getLocalSnippet(id)
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
  if (isAuthenticated()) {
    const result = await snippetUpdate({ data: { id, ...updates } })

    if (result.error) {
      // Try local update
      const local = updateLocalSnippet(id, updates)
      if (local) {
        return { data: { success: true } }
      }
      return { error: result.error.message }
    }

    return { data: result.data }
  }

  // Local mode
  const local = updateLocalSnippet(id, updates)
  if (!local) {
    return { error: 'Snippet not found' }
  }

  return { data: { success: true } }
}

// Delete snippet
export async function deleteSnippet(id: string): Promise<ApiResult<{ success: boolean }>> {
  if (isAuthenticated()) {
    const result = await snippetDelete({ data: { id } })

    if (result.error) {
      // Try local delete
      const success = deleteLocalSnippet(id)
      if (success) {
        return { data: { success: true } }
      }
      return { error: result.error.message }
    }

    return { data: result.data }
  }

  // Local mode
  const success = deleteLocalSnippet(id)
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
export async function syncToServer(): Promise<{ synced: number; errors: number }> {
  const unsynced = getUnsyncedSnippets()
  let synced = 0
  let errors = 0

  for (const snippet of unsynced) {
    const result = await snippetCreate({
      data: {
        title: snippet.title,
        body: snippet.body,
        tags: snippet.tags,
      },
    })

    if (result.error) {
      errors++
    } else {
      markAsSynced(snippet.id)
      synced++
    }
  }

  if (synced > 0) {
    setMeta({ lastSyncAt: Date.now() })
  }

  return { synced, errors }
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
