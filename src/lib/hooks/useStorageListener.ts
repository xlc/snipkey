import { useEffect, useRef } from 'react'

/**
 * Hook to listen for localStorage changes across tabs/windows
 * Useful for keeping UI in sync when user has multiple tabs open
 *
 * @param key - The localStorage key to watch
 * @param callback - Function to call when the key changes
 */
export function useStorageListener<T>(key: string, callback: (newValue: T | null) => void) {
  // Use ref to store the latest callback without causing effect re-runs
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      // Only respond to changes to the specific key
      if (event.key !== key) return

      // Parse the new value
      let newValue: T | null = null
      if (event.newValue) {
        try {
          newValue = JSON.parse(event.newValue) as T
        } catch (error) {
          console.error(`Failed to parse storage value for key "${key}":`, error)
        }
      }

      // Use the ref to avoid stale closures
      callbackRef.current(newValue)
    }

    // Add event listener
    window.addEventListener('storage', handleStorageChange)

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key]) // Exclude callback - we use callbackRef instead
}

/**
 * Hook to listen for authentication changes across tabs
 * Useful for updating UI when user logs in/out in another tab
 */
export function useAuthSync(onAuthChange: (userId: string | null) => void) {
  useStorageListener<{ userId: string | null }>('snipkey_meta', newValue => {
    if (newValue) {
      onAuthChange(newValue.userId)
    }
  })
}
