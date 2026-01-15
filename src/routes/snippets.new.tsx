import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { snippetCreate } from '~/server/snippets'

export const Route = createFileRoute('/snippets/new')({
	component: NewSnippet,
})

function NewSnippet() {
	const handleSubmit = async (data: { title: string; body: string; tags: string[] }) => {
		const result = await snippetCreate({ data })

		if ('error' in result) {
			toast.error(result.error.message)
			throw result.error // Re-throw to let SnippetForm handle loading state
		}

		toast.success('Snippet created!')
	}

	return <SnippetForm mode="create" onSubmit={handleSubmit} />
}
