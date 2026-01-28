import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { Header } from '~/components/Header'
import { NotFound } from '~/components/NotFound'
import { SessionRenewal } from '~/components/SessionRenewal'
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
      <SessionRenewal />
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-3 py-3 sm:px-4 sm:py-6 flex-1">
          <Outlet />
        </main>
        <footer className="border-t py-2 sm:py-4">
          <div className="container mx-auto px-3 sm:px-4 text-center text-xs text-muted-foreground">Snipkey v{__GIT_COMMIT__}</div>
        </footer>
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
