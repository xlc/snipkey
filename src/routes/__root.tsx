import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Toaster } from "~/components/ui/toaster";

export const Route = createRootRoute({
	component: () => (
		<>
			<div className="min-h-screen bg-background">
				<header className="border-b">
					<div className="container mx-auto flex items-center justify-between px-4 py-4">
						<div>
							<h1 className="text-2xl font-bold">Snipkey</h1>
							<p className="text-sm text-muted-foreground">Your private snippet vault</p>
						</div>
						<div className="flex items-center gap-4">
							<Link to="/login">
								<Button variant="outline" size="sm">
									Login / Register
								</Button>
							</Link>
						</div>
					</div>
				</header>
				<main className="container mx-auto px-4 py-8">
					<Outlet />
				</main>
			</div>
			<Toaster />
		</>
	),
});
