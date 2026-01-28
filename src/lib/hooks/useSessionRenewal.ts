import { useCallback, useEffect, useRef } from 'react'
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
          // Session renewal failed - user might need to re-authenticate
          console.warn('Session renewal failed, user may need to log in again')
        }
        // Success - session cookie has been renewed via Set-Cookie header
      }
    } catch (error) {
      // Silently fail - don't bother the user with renewal errors
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
