import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { getSnippet, updateSnippet } from '~/lib/snippet-api'

export const Route = createFileRoute('/snippets/$id/edit')({
  component: EditSnippet,
})

function EditSnippet() {
  const router = useRouter()
  const { id } = Route.useParams()
  const [initialData, setInitialData] = useState<{
    body: string
    tags: string[]
    folder_id: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSnippet() {
      const result = await getSnippet(id)

      if (result.error || !result.data) {
        setLoading(false)
        return
      }

      setInitialData({
        body: result.data.body,
        tags: result.data.tags,
        folder_id: result.data.folder_id,
      })
      setLoading(false)
    }

    loadSnippet()
  }, [id])

  const handleSubmit = async (data: { body: string; tags: string[]; folder_id?: string | null }) => {
    const result = await updateSnippet(id, data)

    if (result.error) {
      throw new Error(result.error) // Re-throw to let SnippetForm handle loading state
    }

    // Navigate back to the snippet page
    router.navigate({ to: '/snippets/$id', params: { id } })
  }

  if (loading || !initialData) {
    return <div className="text-center py-12 text-muted-foreground">Loading snippet...</div>
  }

  return (
    <SnippetForm
      mode="edit"
      id={id}
      initialBody={initialData.body}
      initialTags={initialData.tags}
      initialFolderId={initialData.folder_id}
      onSubmit={handleSubmit}
    />
  )
}
