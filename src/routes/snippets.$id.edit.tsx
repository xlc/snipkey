import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SnippetForm } from '~/components/snippets/SnippetForm'
import { getSnippet, updateSnippet } from '~/lib/snippet-api'

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
      const result = await getSnippet(id)

      if (result.error || !result.data) {
        toast.error(result.error || 'Failed to load snippet')
        setLoading(false)
        return
      }

      setInitialData({
        title: result.data.title,
        body: result.data.body,
        tags: result.data.tags,
      })
      setLoading(false)
    }

    loadSnippet()
  }, [id])

  const handleSubmit = async (data: { title: string; body: string; tags: string[] }) => {
    const result = await updateSnippet(id, data)

    if (result.error) {
      toast.error(result.error)
      throw new Error(result.error) // Re-throw to let SnippetForm handle loading state
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
