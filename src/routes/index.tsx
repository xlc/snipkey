import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useDebounce } from '~/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '~/lib/hooks/useKeyboardShortcuts'
import { snippetsList, snippetCreate } from '~/server/snippets'
import { Tags, Search, X, Filter, Download, Upload } from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

export const Route = createFileRoute('/')({
	component: Index,
})

function Index() {
	const router = useRouter()
	const searchInputRef = useRef<HTMLInputElement>(null)
	const [snippets, setSnippets] = useState<Array<{
		id: string
		title: string
		body: string
		tags: string[]
		updated_at: number
	}> | null>(null)
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedTag, setSelectedTag] = useState<string | null>(null)
	const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [allTags, setAllTags] = useState<string[]>([])

	// Debounce search input to reduce API calls
	const debouncedSearchQuery = useDebounce(searchQuery, 500)

	async function loadSnippets() {
		setLoading(true)
		const result = await snippetsList({
			data: {
				limit: 100,
				query: debouncedSearchQuery || undefined,
				tag: selectedTag || undefined,
			},
		})

		if (result.error) {
			toast.error('Failed to load snippets')
			setLoading(false)
			return
		}

		let items = result.data.items

		// Sort items locally
		items = items.sort((a, b) => {
			let comparison = 0
			if (sortBy === 'title') {
				comparison = a.title.localeCompare(b.title)
			} else if (sortBy === 'created') {
				comparison = a.updated_at - b.updated_at // using updated_at as proxy
			} else {
				comparison = a.updated_at - b.updated_at
			}
			return sortOrder === 'asc' ? comparison : -comparison
		})

		// Extract all unique tags
		const tags = new Set<string>()
		items.forEach(item => item.tags.forEach(tag => tags.add(tag)))
		setAllTags(Array.from(tags).sort())

		setSnippets(items.slice(0, 20)) // Only show first 20 after sorting
		setLoading(false)
	}

	async function handleExport() {
		// Export all snippets
		const result = await snippetsList({
			data: { limit: 1000 },
		})

		if (result.error) {
			toast.error('Failed to export snippets')
			return
		}

		const exportData = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			snippets: result.data.items,
		}

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json',
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `snipkey-export-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		toast.success(`Exported ${result.data.items.length} snippets`)
	}

	async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const importData = JSON.parse(text)

			if (!importData.snippets || !Array.isArray(importData.snippets)) {
				throw new Error('Invalid import file format')
			}

			let imported = 0
			let skipped = 0

			for (const snippet of importData.snippets) {
				const result = await snippetCreate({
					data: {
						title: snippet.title,
						body: snippet.body,
						tags: snippet.tags,
					},
				})

				if (result.error) {
					skipped++
				} else {
					imported++
				}
			}

			toast.success(`Imported ${imported} snippets${skipped > 0 ? ` (${skipped} skipped)` : ''}`)

			// Reload snippets
			loadSnippets()
		} catch (error) {
			toast.error('Failed to import snippets: ' + (error as Error).message)
		}

		// Reset file input
		event.target.value = ''
	}

	// Keyboard shortcuts
	useKeyboardShortcuts([
		{
			key: 'n',
			ctrlKey: true,
			handler: () => router.navigate({ to: '/snippets/new' }),
			description: 'Create new snippet',
		},
		{
			key: '/',
			handler: () => {
				searchInputRef.current?.focus()
			},
			description: 'Focus search',
		},
		{
			key: 'Escape',
			handler: () => {
				if (searchQuery) {
					setSearchQuery('')
				} else if (selectedTag) {
					setSelectedTag(null)
				}
			},
			description: 'Clear filters',
		},
		{
			key: 'e',
			ctrlKey: true,
			handler: handleExport,
			description: 'Export snippets',
		},
	])

	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-load when search, tag, or sort changes
	useEffect(() => {
		loadSnippets()
	}, [debouncedSearchQuery, selectedTag, sortBy, sortOrder])

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">My Snippets</h2>
					<p className="text-muted-foreground mt-2">Your private snippet vault with placeholders</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" asChild>
						<a href="/tags">
							<Tags className="h-4 w-4 mr-2" />
							Manage Tags
						</a>
					</Button>
					<Button variant="outline" onClick={handleExport}>
						<Download className="h-4 w-4 mr-2" />
						Export
					</Button>
					<Button variant="outline" asChild className="relative">
						<label htmlFor="import-input" className="cursor-pointer">
							<Upload className="h-4 w-4 mr-2" />
							Import
							<input
								id="import-input"
								type="file"
								accept=".json"
								onChange={handleImport}
								className="hidden"
							/>
						</label>
					</Button>
					<Button asChild>
						<Link to="/snippets/new">New Snippet</Link>
					</Button>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex gap-2">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							placeholder="Search snippets... (title, content, tags) (/ to focus)"
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="pl-10 pr-10"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<Filter className="h-4 w-4 mr-2" />
								Sort
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setSortBy('updated')}>
								{sortBy === 'updated' && '✓ '}
								Last Updated
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setSortBy('title')}>
								{sortBy === 'title' && '✓ '}
								Title
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
								{sortOrder === 'desc' ? '↑ ' : '↓ '}
								{sortOrder === 'desc' ? 'Descending' : 'Ascending'}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{(selectedTag || searchQuery) && (
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-sm text-muted-foreground">Active filters:</span>
						{selectedTag && (
							<Badge
								variant="secondary"
								className="cursor-pointer"
								onClick={() => setSelectedTag(null)}
							>
								Tag: {selectedTag}
								<X className="h-3 w-3 ml-1" />
							</Badge>
						)}
						{searchQuery && (
							<Badge
								variant="secondary"
								className="cursor-pointer"
								onClick={() => setSearchQuery('')}
							>
								Search: {searchQuery.slice(0, 20)}
								{searchQuery.length > 20 && '...'}
								<X className="h-3 w-3 ml-1" />
							</Badge>
						)}
						{(selectedTag || searchQuery) && (
							<Button
								size="sm"
								variant="ghost"
								className="h-7 text-xs"
								onClick={() => {
									setSelectedTag(null)
									setSearchQuery('')
								}}
							>
								Clear all
							</Button>
						)}
					</div>
				)}

				{allTags.length > 0 && !selectedTag && (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Popular tags:</p>
						<div className="flex gap-2 flex-wrap">
							{allTags.slice(0, 10).map(tag => (
								<Badge
									key={tag}
									variant="outline"
									className="cursor-pointer hover:bg-accent"
									onClick={() => setSelectedTag(tag)}
								>
									{tag}
								</Badge>
							))}
						</div>
					</div>
				)}
			</div>

			{loading ? (
				<div className="text-center py-12 text-muted-foreground">Loading snippets...</div>
			) : snippets && snippets.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{snippets.map(snippet => (
						<Link key={snippet.id} to="/snippets/$id" params={{ id: snippet.id }} className="block group">
							<div className="p-4 border rounded-lg hover:border-primary transition-colors">
								<h3 className="font-semibold group-hover:text-primary transition-colors">
									{snippet.title}
								</h3>
								<p className="text-sm text-muted-foreground mt-2 line-clamp-3">
									{snippet.body.slice(0, 150)}
									{snippet.body.length > 150 && '...'}
								</p>
								{snippet.tags.length > 0 && (
									<div className="flex gap-2 mt-3 flex-wrap">
										{snippet.tags.map(tag => (
											<Badge
												key={tag}
												variant="outline"
												className="text-xs cursor-pointer hover:bg-accent"
												onClick={(e) => {
													e.preventDefault()
													e.stopPropagation()
													setSelectedTag(tag)
												}}
											>
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
							? 'No snippets found matching your criteria'
							: 'No snippets yet. Create your first snippet to get started!'}
					</p>
					{!searchQuery && !selectedTag && (
						<Button asChild>
							<Link to="/snippets/new">Create Snippet</Link>
						</Button>
					)}
				</div>
			)}
		</div>
	)
}
