import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { snippetsList } from "~/server/snippets";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const [snippets, setSnippets] = useState<Array<{
		id: string;
		title: string;
		body: string;
		tags: string[];
		updated_at: number;
	}> | null>(null);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTag, setSelectedTag] = useState<string | null>(null);

	async function loadSnippets() {
		setLoading(true);
		const result = await snippetsList({
			limit: 20,
			query: searchQuery || undefined,
			tag: selectedTag || undefined,
		});

		if (result.error) {
			console.error("Failed to load snippets:", result.error);
			setLoading(false);
			return;
		}

		setSnippets(result.data.items);
		setLoading(false);
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: Only load on mount
	useEffect(() => {
		loadSnippets();
	}, []);

	function handleSearch(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		loadSnippets();
	}

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">My Snippets</h2>
					<p className="text-muted-foreground mt-2">Your private snippet vault with placeholders</p>
				</div>
				<Button asChild>
					<Link to="/snippets/new">New Snippet</Link>
				</Button>
			</div>

			<div className="space-y-4">
				<form onSubmit={handleSearch} className="flex gap-2">
					<Input
						placeholder="Search snippets..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="max-w-sm"
					/>
					<Button type="submit" variant="outline">
						Search
					</Button>
				</form>

				{selectedTag && (
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">Filter:</span>
						<Badge
							variant="secondary"
							className="cursor-pointer"
							onClick={() => setSelectedTag(null)}
						>
							{selectedTag} ×
						</Badge>
					</div>
				)}
			</div>

			{loading ? (
				<div className="text-center py-12 text-muted-foreground">Loading snippets...</div>
			) : snippets && snippets.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{snippets.map((snippet) => (
						<Link key={snippet.id} to={`/snippets/${snippet.id}`} className="block group">
							<div className="p-4 border rounded-lg hover:border-primary transition-colors">
								<h3 className="font-semibold group-hover:text-primary transition-colors">
									{snippet.title}
								</h3>
								<p className="text-sm text-muted-foreground mt-2 line-clamp-3">
									{snippet.body.slice(0, 150)}
									{snippet.body.length > 150 && "..."}
								</p>
								{snippet.tags.length > 0 && (
									<div className="flex gap-2 mt-3 flex-wrap">
										{snippet.tags.map((tag) => (
											<Badge key={tag} variant="outline" className="text-xs">
												{tag}
											</Badge>
										))}
									</div>
								)}
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="text-center py-12">
					<p className="text-muted-foreground mb-4">
						{searchQuery || selectedTag
							? "No snippets found matching your criteria"
							: "No snippets yet. Create your first snippet to get started!"}
					</p>
					{!searchQuery && !selectedTag && (
						<Button asChild>
							<Link to="/snippets/new">Create Snippet</Link>
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
