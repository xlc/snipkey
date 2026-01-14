import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: () => (
		<>
			<div className="p-4">
				<h1 className="text-2xl font-bold">Snipkey</h1>
			</div>
			<hr />
			<Outlet />
		</>
	),
});
