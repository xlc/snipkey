import { parseTemplate } from '@shared/template'
import { LIMITS } from '@shared/validation/limits'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

export interface SnippetFormProps {
	mode: 'create' | 'edit'
	id?: string
	initialTitle?: string
	initialBody?: string
	initialTags?: string[]
	onSubmit: (data: { title: string; body: string; tags: string[] }) => Promise<void>
}

export function SnippetForm({
	mode,
	id,
	initialTitle = '',
	initialBody = '',
	initialTags = [],
	onSubmit,
}: SnippetFormProps) {
	const router = useRouter()
	const [title, setTitle] = useState(initialTitle)
	const [body, setBody] = useState(initialBody)
	const [tagInput, setTagInput] = useState('')
	const [tags, setTags] = useState<string[]>(initialTags)
	const [loading, setLoading] = useState(false)

	// Real-time parsing
	const parseResult = parseTemplate(body)

	function handleAddTag() {
		const trimmed = tagInput.trim().toLowerCase()
		if (trimmed && !tags.includes(trimmed)) {
			setTags([...tags, trimmed])
		}
		setTagInput('')
	}

	function handleRemoveTag(tag: string) {
		setTags(tags.filter(t => t !== tag))
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!title.trim()) {
			toast.error('Title is required')
			return
		}

		if (!body.trim()) {
			toast.error('Body is required')
			return
		}

		// Validate placeholder count
		const parseResult = parseTemplate(body)
		if (parseResult.placeholders.length > LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET) {
			toast.error(`Maximum ${LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET} placeholders allowed`)
			return
		}

		setLoading(true)
		try {
			await onSubmit({
				title: title.trim(),
				body,
				tags,
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-3xl mx-auto space-y-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					{mode === 'create' ? 'New Snippet' : 'Edit Snippet'}
				</h2>
				<p className="text-muted-foreground mt-2">
					{mode === 'create'
						? 'Create a new snippet with placeholders for dynamic values'
						: 'Update your snippet with placeholders'}
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="space-y-2">
					<label htmlFor="title" className="text-sm font-medium">
						Title <span className="text-destructive">*</span>
					</label>
					<Input
						id="title"
						placeholder="My snippet"
						value={title}
						onChange={e => setTitle(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<label htmlFor="body" className="text-sm font-medium">
						Body <span className="text-destructive">*</span>
					</label>
					<Textarea
						id="body"
						placeholder="Hello {{name:text=World}}, you are {{age:number=30}} years old."
						value={body}
						onChange={e => setBody(e.target.value)}
						rows={10}
						className="font-mono text-sm"
						required
					/>
					<p className="text-xs text-muted-foreground">
						Use {'{{name:text}}'} for text, {'{{age:number}}'} for numbers, or{' '}
						{'{{tone:enum(formal,casual)}}'} for enums
					</p>
				</div>

				{/* Parsing feedback */}
				{body && (parseResult.placeholders.length > 0 || parseResult.errors.length > 0) && (
					<div className="space-y-3 p-4 bg-muted rounded-lg">
						<h3 className="text-sm font-medium">Placeholders Found</h3>
						{parseResult.placeholders.length > 0 ? (
							<div className="space-y-2">
								{parseResult.placeholders.map(ph => (
									<div key={ph.name} className="flex items-center gap-2">
										<Badge variant="secondary">{ph.name}</Badge>
										<span className="text-xs text-muted-foreground">
											{ph.phType}
											{ph.options && ` (${ph.options.join(', ')})`}
											{ph.defaultValue !== undefined && ` = "${ph.defaultValue}"`}
										</span>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No placeholders detected</p>
						)}

						{parseResult.errors.length > 0 && (
							<div className="space-y-2">
								<h4 className="text-sm font-medium text-destructive">Errors</h4>
								{parseResult.errors.map(error => (
									<p key={error.start} className="text-sm text-destructive">
										{error.message}
									</p>
								))}
							</div>
						)}
					</div>
				)}

				<div className="space-y-2">
					<label htmlFor="tags" className="text-sm font-medium">
						Tags (optional)
					</label>
					<div className="flex gap-2">
						<Input
							id="tags"
							placeholder="Add a tag..."
							value={tagInput}
							onChange={e => setTagInput(e.target.value)}
							onKeyDown={e => {
								if (e.key === 'Enter') {
									e.preventDefault()
									handleAddTag()
								}
							}}
						/>
						<Button type="button" variant="outline" onClick={handleAddTag}>
							Add
						</Button>
					</div>
					{tags.length > 0 && (
						<div className="flex gap-2 flex-wrap mt-2">
							{tags.map(tag => (
								<Badge
									key={tag}
									variant="secondary"
									className="cursor-pointer"
									onClick={() => handleRemoveTag(tag)}
								>
									{tag} ×
								</Badge>
							))}
						</div>
					)}
				</div>

				<div className="flex gap-4">
					<Button type="submit" disabled={loading}>
						{loading
							? mode === 'create'
								? 'Creating...'
								: 'Updating...'
							: mode === 'create'
								? 'Create Snippet'
								: 'Update Snippet'}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							mode === 'create'
								? router.navigate({ to: '/' })
								: router.navigate({ to: '/snippets/$id', params: { id: id! } })
						}
						disabled={loading}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	)
}
