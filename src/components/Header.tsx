import { Link } from '@tanstack/react-router'
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { getAuthStatus } from '~/lib/snippet-api'
import { authLogout } from '~/server/auth'

export function Header() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const status = await getAuthStatus()
      setAuthenticated(status.authenticated)
      setLoading(false)
    }
    checkAuth()
  }, [])

  async function handleLogout() {
    await authLogout({})
    window.location.href = '/'
  }

  if (loading) {
    return (
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Snipkey</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your private snippet vault</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-9 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Snipkey</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            Your private snippet vault{!authenticated && ' • Works Offline'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {authenticated ? (
            <Button variant="ghost" size="sm" asChild className="touch-manipulation">
              <Link to="/login" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild className="touch-manipulation">
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
