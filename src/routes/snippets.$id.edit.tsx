import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { snippetGet, snippetUpdate } from '~/server/snippets'

export const Route = createFileRoute('/snippets/$id/edit')({
	component: EditSnippet,
})

function EditSnippet() {
	const { id } = Route.useParams()
	const [initialData, setInitialData] = useState<{
		title: string
		body: string
		tags: string[]
	} | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function loadSnippet() {
			const result = await snippetGet({ data: { id } })

			if ('error' in result) {
				toast.error(result.error.message)
				setLoading(false)
				return
			}

			const data = result.data as any
			setInitialData({
				title: data.title,
				body: data.body,
				tags: data.tags,
			})
			setLoading(false)
		}

		loadSnippet()
	}, [id])

	const handleSubmit = async (data: { title: string; body: string; tags: string[] }) => {
		const result = await snippetUpdate({ data: { id, ...data } })

		if ('error' in result) {
			toast.error(result.error.message)
			throw result.error // Re-throw to let SnippetForm handle loading state
		}

		toast.success('Snippet updated!')
	}

	if (loading || !initialData) {
		return <div className="text-center py-12 text-muted-foreground">Loading snippet...</div>
	}

	return (
		<SnippetForm
			mode="edit"
			id={id}
			initialTitle={initialData.title}
			initialBody={initialData.body}
			initialTags={initialData.tags}
			onSubmit={handleSubmit}
		/>
	)
}
