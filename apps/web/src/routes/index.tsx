import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">Welcome to Snipkey</h2>
				<p className="text-muted-foreground mt-2">
					Your private snippet vault with placeholders and inline editing
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4">
					<h3 className="text-xl font-semibold">UI Components Test</h3>
					<div className="space-y-3">
						<div className="flex gap-2 flex-wrap">
							<Button variant="default">Default Button</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="destructive">Destructive</Button>
							<Button variant="link">Link</Button>
						</div>

						<Input placeholder="Enter text..." />

						<div className="flex gap-2 flex-wrap">
							<Badge>Default</Badge>
							<Badge variant="secondary">Secondary</Badge>
							<Badge variant="outline">Outline</Badge>
							<Badge variant="destructive">Destructive</Badge>
						</div>

						<Button onClick={() => toast.success("Toast notification working!")}>Test Toast</Button>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-xl font-semibold">Features</h3>
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							Passkey authentication
						</li>
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							Private snippet vault
						</li>
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							Placeholder system (text, number, enum)
						</li>
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							Inline placeholder editing
						</li>
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							Mobile-first design
						</li>
						<li className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-primary" />
							One-tap copy rendered output
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
