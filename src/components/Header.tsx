import { Link } from '@tanstack/react-router'
import { Cloud, CloudOff, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useMetaState } from '~/lib/hooks/useLocalStorageState'
import { useAuthSync } from '~/lib/hooks/useStorageListener'
import { clearLocalSnippets, getDeletedSnippets, getUnsyncedSnippets } from '~/lib/local-storage'
import { getAuthStatus } from '~/lib/snippet-api'
import { authLogout } from '~/server/auth'

export function Header() {
  const [_meta, setMeta] = useMetaState()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [_animating, setAnimating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Sync authentication state across tabs
  useAuthSync(userId => {
    setAuthenticated(userId !== null)
  })

  useEffect(() => {
    async function checkAuth() {
      const status = await getAuthStatus()
      setAnimating(true)
      setAuthenticated(status.authenticated)
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
          setAuthenticated(status.authenticated)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function handleLogout() {
    // Check for unsynced changes and pending deletions
    const unsynced = getUnsyncedSnippets()
    const deleted = getDeletedSnippets()
    const unsyncedCount = unsynced.length + deleted.length

    if (unsyncedCount > 0) {
      const changes = []
      if (unsynced.length > 0) changes.push(`${unsynced.length} unsynced snippet${unsynced.length > 1 ? 's' : ''}`)
      if (deleted.length > 0) changes.push(`${deleted.length} pending deletion${deleted.length > 1 ? 's' : ''}`)

      const confirmLogout = confirm(`You have ${changes.join(' and ')}. Logging out will permanently delete these local changes. Continue?`)
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
      setAuthenticated(false)
      toast.info('Logged out. All local data has been cleared.')
      // Redirect immediately (no need to reset isLoggingOut before page reload)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
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
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
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
