import useLocalStorageState from 'use-local-storage-state'
import type { IdMap, Meta } from '~/lib/local-storage'

const META_KEY = 'snipkey_meta'
const ID_MAP_KEY = 'snipkey_id_map'

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
