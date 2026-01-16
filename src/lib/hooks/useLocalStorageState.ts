import useLocalStorageState from 'use-local-storage-state'
import type { IdMap, LocalSnippet, Meta } from '~/lib/local-storage'

const STORAGE_PREFIX = 'snippet_'
const META_KEY = 'snipkey_meta'
const ID_MAP_KEY = 'snipkey_id_map'

function getSnippetKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`
}

/**
 * Reactive hook for accessing and updating meta information
 * Automatically syncs with localStorage and triggers re-renders
 * SSR-safe: uses defaultValue on server, persisted value on client
 */
export function useMetaState() {
  return useLocalStorageState<Meta>(META_KEY, {
    defaultValue: {
      userId: null,
      lastSyncAt: null,
      mode: 'local',
    },
  })
}

/**
 * Reactive hook for accessing ID mapping
 * Automatically syncs with localStorage and triggers re-renders
 */
export function useIdMapState() {
  return useLocalStorageState<IdMap>(ID_MAP_KEY, {
    defaultValue: {},
  })
}

/**
 * Reactive hook for accessing a single snippet by ID
 * Automatically syncs with localStorage and triggers re-renders
 * Returns null if snippet doesn't exist
 * Note: This is a simpler version that doesn't sync back to storage
 * Use the imperative functions in local-storage.ts for mutations
 */
export function useSnippetState(id: string | undefined) {
  const key = id ? getSnippetKey(id) : '__invalid__'

  return useLocalStorageState<LocalSnippet | null>(key, {
    defaultValue: null,
    // Never persist from this hook - only read from localStorage
    // Mutations should go through local-storage.ts functions
    storageSync: false,
  })
}
