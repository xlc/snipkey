import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { Header } from '~/components/Header'
import { NotFound } from '~/components/NotFound'
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
        <Header />
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
