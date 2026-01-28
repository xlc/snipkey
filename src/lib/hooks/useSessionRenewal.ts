import { useCallback, useEffect, useRef } from 'react'
import { setMeta } from '~/lib/local-storage'
import { authRenewSession } from '~/server/auth'

/**
 * Hook to automatically renew user sessions
 *
 * Sessions expire after 7 days. This hook renews the session:
 * - Once on mount (if authenticated)
 * - Periodically every 6 hours while the user is active
 *
 * This ensures active users stay logged in indefinitely while
 * inactive users will eventually be logged out when their session expires.
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 */
export function useSessionRenewal(isAuthenticated: boolean): void {
  const hasRenewedOnMountRef = useRef(false)

  const renewSession = useCallback(async (): Promise<void> => {
    try {
      const result = await authRenewSession()

      // Handle Response object
      if (result instanceof Response) {
        if (!result.ok) {
          // Session renewal failed - clear local auth state
          // This happens when session is truly expired/revoked on server
          console.warn('Session renewal failed - clearing local auth state')
          setMeta({ userId: null, mode: 'local', lastSyncAt: null })
          return
        }
        // Success - session cookie has been renewed via Set-Cookie header
      }
    } catch (error) {
      // Network error or other failure - don't clear state, might be transient
      // The next authenticated request will fail if the session is truly expired
      console.warn('Session renewal error:', error)
    }
  }, [])

  useEffect(() => {
    // Only run renewal if user is authenticated
    if (!isAuthenticated) {
      return
    }

    // Renew session on mount (once per session)
    if (!hasRenewedOnMountRef.current) {
      hasRenewedOnMountRef.current = true
      renewSession()
    }

    // Set up periodic renewal (every 6 hours)
    // This is more frequent than necessary (7 day expiry) but ensures
    // sessions are renewed even if the browser is left open
    const intervalId = setInterval(
      () => {
        renewSession()
      },
      6 * 60 * 60 * 1000,
    ) // 6 hours

    return () => {
      clearInterval(intervalId)
    }
  }, [isAuthenticated, renewSession])
}
