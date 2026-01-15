import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Button } from '~/components/ui/button'
import { Toaster } from '~/components/ui/toaster'

export const Route = createRootRoute({
	component: () => (
		<>
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
		</>
	),
})
