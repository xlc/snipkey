import { useSessionRenewal } from '~/lib/hooks'
import { isAuthenticated } from '~/lib/local-storage'

/**
 * SessionRenewal component
 *
 * This component is rendered once in the root layout and automatically
 * renews user sessions to keep authenticated users logged in.
 *
 * Sessions are renewed:
 * - Once on mount (if authenticated)
 * - Every 6 hours while active
 *
 * The renewal is silent and won't interrupt the user. If renewal fails
 * (e.g., session truly expired), the next authenticated request will
 * fail and the user will be prompted to log in again.
 */
export function SessionRenewal(): null {
  useSessionRenewal(isAuthenticated())

  // This component doesn't render anything
  return null
}
