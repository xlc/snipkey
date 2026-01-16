import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { createSnippet } from '~/lib/snippet-api'

export const Route = createFileRoute('/snippets/new')({
  component: NewSnippet,
})

function NewSnippet() {
  const handleSubmit = async (data: { title: string; body: string; tags: string[] }) => {
    const result = await createSnippet(data)

    if (result.error) {
      toast.error(result.error)
      throw new Error(result.error) // Re-throw to let SnippetForm handle loading state
    }

    toast.success('Snippet created!')
  }

  return <SnippetForm mode="create" onSubmit={handleSubmit} />
}
