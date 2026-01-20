import { Link } from '@tanstack/react-router'
import { Cloud, CloudOff, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useMetaState } from '~/lib/hooks/useLocalStorageState'
import { clearLocalSnippets, getDeletedSnippets, getUnsyncedSnippets } from '~/lib/local-storage'
import { getAuthStatus } from '~/lib/snippet-api'
import { authLogout } from '~/server/auth'

export function Header() {
  const [meta, setMeta] = useMetaState()
  const [loading, setLoading] = useState(true)
  const [_animating, setAnimating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Derive authenticated state from meta.userId
  const authenticated = meta.userId !== null

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run on mount, not when meta changes
  useEffect(() => {
    async function checkAuth() {
      const status = await getAuthStatus()
      setAnimating(true)
      // Sync meta with server auth status
      if (status.authenticated && status.userId) {
        setMeta({ userId: status.userId, mode: 'cloud', lastSyncAt: meta.lastSyncAt })
      } else if (!status.authenticated && meta.userId !== null) {
        // Server says not authenticated but we have userId locally - clear it
        setMeta({ userId: null, mode: 'local', lastSyncAt: null })
      }
      setTimeout(() => {
        setLoading(false)
        setAnimating(false)
      }, 150)
    }
    checkAuth()
  }, [])

  // Re-check auth status when window gains focus or becomes visible (handles redirect from login/register)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getAuthStatus().then(status => {
          if (status.authenticated && status.userId) {
            setMeta({ userId: status.userId, mode: 'cloud', lastSyncAt: meta.lastSyncAt })
          } else if (!status.authenticated && meta.userId !== null) {
            setMeta({ userId: null, mode: 'local', lastSyncAt: null })
          }
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [meta.lastSyncAt, meta.userId, setMeta])

  async function handleLogout() {
    // Check for unsynced changes and pending deletions
    const unsynced = getUnsyncedSnippets()
    const deleted = getDeletedSnippets()

    // Filter out snippets that exist on both server and local (these are safe)
    // Only warn about truly local-only changes
    const trulyUnsynced = unsynced.filter(s => !s.serverId)
    const trulyDeleted = deleted.filter(s => s.serverId)
    const unsyncedCount = trulyUnsynced.length + trulyDeleted.length

    if (unsyncedCount > 0) {
      const changes = []
      if (trulyUnsynced.length > 0) changes.push(`${trulyUnsynced.length} unsynced snippet${trulyUnsynced.length > 1 ? 's' : ''}`)
      if (trulyDeleted.length > 0) changes.push(`${trulyDeleted.length} pending deletion${trulyDeleted.length > 1 ? 's' : ''}`)

      const confirmLogout = confirm(`You have ${changes.join(' and ')}. Logging out will lose these local changes. Continue?`)
      if (!confirmLogout) return
    }

    setIsLoggingOut(true)
    try {
      await authLogout({})
    } catch {
      // Logout failed on server, but continue with local cleanup
      // Error is silently handled - user experience is preserved
    } finally {
      // Always clear local data, even if authLogout fails
      clearLocalSnippets()
      // setMeta (from useMetaState) updates both React state and localStorage
      setMeta({ userId: null, mode: 'local', lastSyncAt: null })
      toast.info('Logged out. All local data has been cleared.')
      // Redirect immediately (no need to reset isLoggingOut before page reload)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-4">
          <div className="min-w-0 flex-1">
            <div className="space-y-1.5">
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3.5 w-40 bg-muted/50 animate-pulse rounded hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Snipkey
            </h1>
            {!authenticated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300">
                <CloudOff className="h-3 w-3" />
                <span className="hidden sm:inline">Local Mode</span>
              </span>
            )}
            {authenticated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300">
                <Cloud className="h-3 w-3" />
                <span className="hidden sm:inline">Cloud Sync</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {authenticated ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{isLoggingOut ? 'Logging out…' : 'Logout'}</span>
            </Button>
          ) : (
            <Button variant="default" size="sm" asChild className="touch-manipulation shadow-sm hover:shadow transition-all duration-200">
              <Link to="/login">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Up</span>
                <span className="sm:hidden">Sign Up</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
