import { parseTemplate, renderTemplate } from "@shared/template";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { snippetDelete, snippetGet } from "~/server/snippets";

export const Route = createFileRoute("/snippets/$id")({
	component: SnippetDetail,
});

function SnippetDetail() {
	const router = useRouter();
	const { id } = Route.useParams();
	const [snippet, setSnippet] = useState<{
		id: string;
		title: string;
		body: string;
		tags: string[];
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
	const [rendered, setRendered] = useState("");
	const [renderErrors, setRenderErrors] = useState(false);

	useEffect(() => {
		loadSnippet();
	}, [id]);

	async function loadSnippet() {
		setLoading(true);
		const result = await snippetGet({ id });

		if (result.error) {
			toast.error(result.error.message);
			router.push({ to: "/" });
			setLoading(false);
			return;
		}

		setSnippet(result.data);
		setLoading(false);
	}

	useEffect(() => {
		if (!snippet) return;

		// Parse the body
		const parseResult = parseTemplate(snippet.body);

		// Render with current values
		const renderResult = renderTemplate(parseResult.segments, placeholderValues);
		setRendered(renderResult.rendered);
		setRenderErrors(!!renderResult.errors);
	}, [snippet, placeholderValues]);

	async function handleCopy() {
		if (!snippet) return;

		if (renderErrors) {
			toast.error("Cannot copy: placeholder values have errors");
			return;
		}

		try {
			await navigator.clipboard.writeText(rendered);
			toast.success("Copied to clipboard!");
		} catch {
			toast.error("Failed to copy to clipboard");
		}
	}

	async function handleDelete() {
		if (!snippet) return;
		if (!confirm("Are you sure you want to delete this snippet?")) return;

		const result = await snippetDelete({ id });
		if (result.error) {
			toast.error(result.error.message);
			return;
		}

		toast.success("Snippet deleted");
		router.push({ to: "/" });
	}

	if (loading) {
		return <div className="text-center py-12 text-muted-foreground">Loading snippet...</div>;
	}

	if (!snippet) {
		return <div className="text-center py-12 text-muted-foreground">Snippet not found</div>;
	}

	const parseResult = parseTemplate(snippet.body);

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{snippet.title}</h1>
					{snippet.tags.length > 0 && (
						<div className="flex gap-2 mt-3 flex-wrap">
							{snippet.tags.map((tag) => (
								<Badge key={tag} variant="outline">
									{tag}
								</Badge>
							))}
						</div>
					)}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<a href={`/snippets/${id}/edit`}>Edit</a>
					</Button>
					<Button variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
				</div>
			</div>

			{/* Placeholder values */}
			{parseResult.placeholders.length > 0 && (
				<div className="space-y-4 p-4 bg-muted rounded-lg">
					<h2 className="text-sm font-medium">Placeholder Values</h2>
					<div className="grid gap-4 md:grid-cols-2">
						{parseResult.placeholders.map((ph) => (
							<div key={ph.name} className="space-y-2">
								<label className="text-sm font-medium" htmlFor={`ph-${ph.name}`}>
									{ph.name} ({ph.phType})
									{ph.defaultValue !== undefined && ` = "${ph.defaultValue}"`}
								</label>
								<Input
									id={`ph-${ph.name}`}
									placeholder={ph.defaultValue ?? ""}
									value={placeholderValues[ph.name] ?? ""}
									onChange={(e) =>
										setPlaceholderValues({ ...placeholderValues, [ph.name]: e.target.value })
									}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Rendered output */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-medium">Rendered Output</h2>
					<Button onClick={handleCopy} disabled={renderErrors}>
						Copy to Clipboard
					</Button>
				</div>
				<div className="p-4 bg-muted rounded-lg">
					<pre className="whitespace-pre-wrap font-mono text-sm">{rendered || snippet.body}</pre>
				</div>
				{renderErrors && (
					<p className="text-sm text-destructive">
						Some placeholder values have errors. Please fix them before copying.
					</p>
				)}
			</div>

			{/* Raw body */}
			<details className="space-y-2">
				<summary className="text-sm font-medium cursor-pointer">Raw Template</summary>
				<div className="p-4 bg-muted rounded-lg">
					<pre className="whitespace-pre-wrap font-mono text-xs">{snippet.body}</pre>
				</div>
			</details>
		</div>
	);
}
