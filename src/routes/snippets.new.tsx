import { createFileRoute, useRouter } from '@tanstack/react-router'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { createSnippet } from '~/lib/snippet-api'

export const Route = createFileRoute('/snippets/new')({
  component: NewSnippet,
})

function NewSnippet() {
  const router = useRouter()

  const handleSubmit = async (data: { body: string; tags: string[]; folder_id?: string | null }) => {
    const result = await createSnippet(data)

    if (result.error) {
      throw new Error(result.error) // Re-throw to let SnippetForm handle loading state
    }

    // Navigate to the new snippet page
    if (result.data?.id) {
      router.navigate({ to: '/snippets/$id', params: { id: result.data.id } })
    }
  }

  return <SnippetForm mode="create" onSubmit={handleSubmit} />
}
