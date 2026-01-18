import { type getDb, newId, nowMs } from '@shared/db/db'
import type { ApiError, Result } from '@shared/types/common'
import { sql } from 'kysely'

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

export interface FolderWithChildren extends Folder {
  children: Folder[]
}

export interface FolderTreeItem {
  id: string
  name: string
  color: string
  icon: string
  position: number
  parent_id: string | null
  snippet_count: number
  children: FolderTreeItem[]
}

// Create a new folder
export async function folderCreate(
  db: ReturnType<typeof getDb>,
  userId: string,
  data: {
    name: string
    color?: string
    icon?: string
    parent_id?: string | null
    position?: number
  },
): Promise<Result<{ folder: Folder }, ApiError>> {
  try {
    const now = nowMs()
    const folderId = newId()

    // If position is provided, use it directly
    if (data.position !== undefined) {
      const folder: Folder = {
        id: folderId,
        user_id: userId,
        parent_id: data.parent_id ?? null,
        name: data.name,
        color: data.color ?? 'gray',
        icon: data.icon ?? 'Folder',
        created_at: now,
        updated_at: now,
        position: data.position,
      }

      await db.insertInto('folders').values(folder).execute()

      return { ok: true, data: { folder } }
    }

    // Otherwise, use atomic position calculation via subquery
    // This prevents race conditions by calculating position in a single query
    await db
      .insertInto('folders')
      .values({
        id: folderId,
        user_id: userId,
        parent_id: data.parent_id ?? null,
        name: data.name,
        color: data.color ?? 'gray',
        icon: data.icon ?? 'Folder',
        created_at: now,
        updated_at: now,
        position: sql<number>`COALESCE((SELECT MAX(position) FROM folders WHERE user_id = ${userId} AND parent_id IS ${data.parent_id ?? null}), -1) + 1`,
      })
      .execute()

    const folder: Folder = {
      id: folderId,
      user_id: userId,
      parent_id: data.parent_id ?? null,
      name: data.name,
      color: data.color ?? 'gray',
      icon: data.icon ?? 'Folder',
      created_at: now,
      updated_at: now,
      position: 0, // Will be set by the trigger/subquery
    }

    return { ok: true, data: { folder } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDER_CREATE_FAILED',
        message: 'Failed to create folder',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// List all folders for a user (flat list)
export async function foldersList(db: ReturnType<typeof getDb>, userId: string): Promise<Result<{ folders: Folder[] }, ApiError>> {
  try {
    const folders = await db
      .selectFrom('folders')
      .where('user_id', '=', userId)
      .orderBy('position', 'asc')
      .orderBy('created_at', 'asc')
      .selectAll()
      .execute()

    return { ok: true, data: { folders } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDERS_LIST_FAILED',
        message: 'Failed to list folders',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// Legacy export for backward compatibility
export const _foldersList = foldersList

// Get folder tree with snippet counts
export async function foldersTree(db: ReturnType<typeof getDb>, userId: string): Promise<Result<{ tree: FolderTreeItem[] }, ApiError>> {
  try {
    // Get all folders
    const folders = await db.selectFrom('folders').where('user_id', '=', userId).orderBy('position', 'asc').selectAll().execute()

    // Count snippets in each folder
    const snippetCounts = await db
      .selectFrom('snippets')
      .select(['folder_id', eb => eb.fn.count('id').as('count')])
      .where('user_id', '=', userId)
      .where('folder_id', 'is not', null)
      .groupBy('folder_id')
      .execute()

    const countMap = new Map<string, number>()
    for (const row of snippetCounts) {
      if (row.folder_id) {
        countMap.set(row.folder_id, (row.count as number) ?? 0)
      }
    }

    // Build tree
    const buildTree = (parentId: string | null): FolderTreeItem[] => {
      return folders
        .filter(f => f.parent_id === parentId)
        .map(folder => ({
          id: folder.id,
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          position: folder.position,
          parent_id: folder.parent_id,
          snippet_count: countMap.get(folder.id) ?? 0,
          children: buildTree(folder.id),
        }))
    }

    const tree = buildTree(null)

    return { ok: true, data: { tree } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDERS_TREE_FAILED',
        message: 'Failed to build folder tree',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// Legacy export for backward compatibility
export const _foldersTree = foldersTree

// Get a single folder
export async function folderGet(
  db: ReturnType<typeof getDb>,
  userId: string,
  folderId: string,
): Promise<Result<{ folder: Folder }, ApiError>> {
  try {
    const folder = await db.selectFrom('folders').where('id', '=', folderId).where('user_id', '=', userId).selectAll().executeTakeFirst()

    if (!folder) {
      return {
        ok: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found',
        },
      }
    }

    return { ok: true, data: { folder } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDER_GET_FAILED',
        message: 'Failed to get folder',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// Legacy export for backward compatibility
export const _folderGet = folderGet

// Update a folder
export async function folderUpdate(
  db: ReturnType<typeof getDb>,
  userId: string,
  folderId: string,
  data: Partial<{
    name: string
    color: string
    icon: string
    parent_id: string | null
    position: number
  }>,
): Promise<Result<{ folder: Folder }, ApiError>> {
  try {
    // Check if folder exists and belongs to user
    const existing = await _folderGet(db, userId, folderId)
    if (!existing.ok) {
      return existing
    }

    const now = nowMs()
    const updates: Partial<Folder> = {
      ...data,
      updated_at: now,
    }

    await db.updateTable('folders').set(updates).where('id', '=', folderId).execute()

    const updated = await _folderGet(db, userId, folderId)
    if (!updated.ok) {
      return updated
    }

    return { ok: true, data: { folder: updated.data.folder } }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDER_UPDATE_FAILED',
        message: 'Failed to update folder',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// Legacy export for backward compatibility
export const _folderUpdate = folderUpdate

// Delete a folder
export async function folderDelete(db: ReturnType<typeof getDb>, userId: string, folderId: string): Promise<Result<void, ApiError>> {
  try {
    // Check if folder exists and belongs to user
    const existing = await _folderGet(db, userId, folderId)
    if (!existing.ok) {
      return existing
    }

    // Unassign all snippets in this folder
    await db.updateTable('snippets').set({ folder_id: null }).where('folder_id', '=', folderId).execute()

    // Delete the folder (cascade will delete children)
    await db.deleteFrom('folders').where('id', '=', folderId).execute()

    return { ok: true, data: undefined }
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'FOLDER_DELETE_FAILED',
        message: 'Failed to delete folder',
        details: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

// Legacy export for backward compatibility
export const _folderDelete = folderDelete
