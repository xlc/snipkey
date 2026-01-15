import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { Button } from '~/components/ui/button'
import { Toaster } from '~/components/ui/toaster'
import appCss from '~/styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Snipkey - Your Private Snippet Vault',
      },
      {
        name: 'description',
        content: 'Securely store and manage your code snippets with placeholders for dynamic values',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  component: () => (
    <RootDocument>
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">Snipkey</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your private snippet vault</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/login">
                <Button variant="outline" size="sm" className="touch-manipulation">
                  <span className="hidden sm:inline">Login / Register</span>
                  <span className="sm:hidden">Login</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 sm:py-8 pb-20">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <TanStackRouterDevtools />
      </body>
    </html>
  )
}
