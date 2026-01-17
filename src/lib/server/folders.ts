import type { Database } from '@shared/db/database'
import { newId, nowMs } from '@shared/db/db'
import type { ApiError, ErrorCode } from '@shared/types'
import type { Result } from '@shared/types/common'
import { err, ok } from '@shared/types/common'
import type { getDb } from '@shared/db/db'

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
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
  data: {
    name: string
    color?: string
    icon?: string
    parent_id?: string | null
    position?: number
  },
): Promise<Result<{ folder: Folder }>> {
  try {
    const now = nowMs()
    const folderId = newId()

    // Get max position if not provided
    let position = data.position ?? 0
    if (data.position === undefined) {
      const maxPosResult = await db
        .selectFrom('folders')
        .where('user_id', '=', userId)
        .where('parent_id', '=', data.parent_id ?? null)
        .select((eb) => [eb.fn.max('folders.position').as('max_position')])
        .executeTakeFirst()

      if (maxPosResult) {
        const maxPosition = maxPosResult.max_position as number | null
        position = (maxPosition ?? -1) + 1
      }
    }

    const folder: Folder = {
      id: folderId,
      user_id: userId,
      parent_id: data.parent_id ?? null,
      name: data.name,
      color: data.color ?? 'gray',
      icon: data.icon ?? 'Folder',
      created_at: now,
      updated_at: now,
      position,
    }

    await db.insertInto('folders').values(folder).execute()

    return ok({ folder })
  } catch (error) {
    return {
      error: {
        code: 'FOLDER_CREATE_FAILED',
        message: 'Failed to create folder',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}

// Get all folders for a user (flat list)
export async function foldersList(
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
): Promise<Result<{ folders: Folder[] }>> {
  try {
    const folders = await db
      .selectFrom('folders')
      .where('user_id', '=', userId)
      .orderBy('position', 'asc')
      .orderBy('created_at', 'asc')
      .selectAll()
      .execute()

    return ok({ folders })
  } catch (error) {
    return {
      error: {
        code: 'FOLDERS_LIST_FAILED',
        message: 'Failed to list folders',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}

// Get folder tree with snippet counts
export async function foldersTree(
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
): Promise<Result<{ tree: FolderTreeItem[] }>> {
  try {
    // Get all folders
    const folders = await db
      .selectFrom('folders')
      .where('user_id', '=', userId)
      .orderBy('position', 'asc')
      .selectAll()
      .execute()

    // Count snippets in each folder
    const snippetCounts = await db
      .selectFrom('snippets')
      .select(['folder_id', (eb) => eb.fn.count('id').as('count')])
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
        .filter((f) => f.parent_id === parentId)
        .map((folder) => ({
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

    return ok({ tree })
  } catch (error) {
    return {
      error: {
        code: 'FOLDERS_TREE_FAILED',
        message: 'Failed to build folder tree',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}

// Get a single folder
export async function folderGet(
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
  folderId: string,
): Promise<Result<{ folder: Folder }>> {
  try {
    const folder = await db
      .selectFrom('folders')
      .where('id', '=', folderId)
      .where('user_id', '=', userId)
      .selectAll()
      .executeTakeFirst()

    if (!folder) {
      return {
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: 'Folder not found',
        } satisfies ApiError,
      }
    }

    return ok({ folder })
  } catch (error) {
    return {
      error: {
        code: 'FOLDER_GET_FAILED',
        message: 'Failed to get folder',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}

// Update a folder
export async function folderUpdate(
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
  folderId: string,
  data: Partial<{
    name: string
    color: string
    icon: string
    parent_id: string | null
    position: number
  }>,
): Promise<Result<{ folder: Folder }>> {
  try {
    // Check if folder exists and belongs to user
    const existing = await folderGet(db, userId, folderId)
    if (!existing.ok) {
      return existing
    }

    const now = nowMs()
    const updates: Partial<Folder> = {
      ...data,
      updated_at: now,
    }

    await db.updateTable('folders').set(updates).where('id', '=', folderId).execute()

    const updated = await folderGet(db, userId, folderId)
    if (!updated.ok) {
      return updated
    }

    return ok({ folder: updated.data.folder })
  } catch (error) {
    return {
      error: {
        code: 'FOLDER_UPDATE_FAILED',
        message: 'Failed to update folder',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}

// Delete a folder
export async function folderDelete(
  db: ReturnType<import('@shared/db/db').getDb>,
  userId: string,
  folderId: string,
): Promise<Result<void>> {
  try {
    // Check if folder exists and belongs to user
    const existing = await folderGet(db, userId, folderId)
    if (!existing.ok) {
      return existing
    }

    // Unassign all snippets in this folder
    await db
      .updateTable('snippets')
      .set({ folder_id: null })
      .where('folder_id', '=', folderId)
      .execute()

    // Delete the folder (cascade will delete children)
    await db.deleteFrom('folders').where('id', '=', folderId).execute()

    return ok(undefined)
  } catch (error) {
    return {
      error: {
        code: 'FOLDER_DELETE_FAILED',
        message: 'Failed to delete folder',
        details: error instanceof Error ? error.message : String(error),
      } satisfies ApiError,
    }
  }
}
