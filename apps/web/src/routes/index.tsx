import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return (
		<div className="p-4">
			<p>Welcome to Snipkey - Your private snippet vault!</p>
		</div>
	);
}
