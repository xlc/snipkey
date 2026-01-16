import { Link } from '@tanstack/react-router'
import { Cloud, CloudOff, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { clearLocalSnippets, setMeta } from '~/lib/local-storage'
import { getAuthStatus } from '~/lib/snippet-api'
import { authLogout } from '~/server/auth'

export function Header() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [_animating, setAnimating] = useState(false)

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

  async function handleLogout() {
    await authLogout({})
    // Clear all local data for privacy
    clearLocalSnippets()
    setMeta({ userId: null, mode: 'local', lastSyncAt: null })
    setAuthenticated(false)
    toast.info('Logged out. All local data has been cleared.')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 transition-all duration-300">
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
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 transition-all duration-300">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block mt-0.5">
            Your private snippet vault{!authenticated && ' • Works Offline'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {authenticated ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Link to="/login" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Link>
            </Button>
          ) : (
            <Button variant="default" size="sm" asChild className="touch-manipulation shadow-sm hover:shadow transition-all duration-200">
              <Link to="/login">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign Up (It's Free)</span>
                <span className="sm:hidden">Sign Up</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
