import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Edit2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { snippetsList } from '~/server/snippets'

export const Route = createFileRoute('/tags')({
  component: TagsPage,
})

function TagsPage() {
  const router = useRouter()
  const [tags, setTags] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')

  const loadTags = useCallback(async () => {
    setLoading(true)
    setLoading(true)
    const result = await snippetsList({
      data: {
        limit: 1000,
      },
    })

    if (result.error) {
      toast.error(result.error.message)
      setLoading(false)
      return
    }

    // Aggregate tags from all snippets
    const tagCounts = new Map<string, number>()
    for (const snippet of result.data.items) {
      for (const tag of snippet.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    }

    setTags(tagCounts)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  async function handleRenameTag(oldTag: string) {
    if (!newTagName.trim()) {
      toast.error('Tag name cannot be empty')
      return
    }

    const newTag = newTagName.trim()

    if (newTag === oldTag) {
      setEditingTag(null)
      setNewTagName('')
      return
    }

    // Check if tag already exists
    if (tags.has(newTag)) {
      toast.error('Tag already exists')
      return
    }

    // Get all snippets with this tag
    const result = await snippetsList({
      data: {
        limit: 1000,
      },
    })

    if (result.error) {
      toast.error(result.error.message)
      return
    }

    // Update each snippet
    // Note: This requires implementing bulk update or individual updates
    toast.info('Tag renaming requires backend updates - coming soon')
    setEditingTag(null)
    setNewTagName('')
  }

  async function handleDeleteTag(tag: string) {
    if (!confirm(`Delete tag "${tag}"? This will remove it from all snippets.`)) return

    // Get all snippets with this tag
    const result = await snippetsList({
      data: {
        limit: 1000,
      },
    })

    if (result.error) {
      toast.error(result.error.message)
      return
    }

    // Update each snippet to remove the tag
    // Note: This requires implementing bulk update or individual updates
    toast.info('Tag deletion requires backend updates - coming soon')
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading tags...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
        <p className="text-muted-foreground mt-2">Manage and organize your snippet tags</p>
      </div>

      {tags.size === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tags found</div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {tags.size} {tags.size === 1 ? 'tag' : 'tags'} total
          </div>

          <div className="space-y-2">
            {Array.from(tags.entries())
              .sort(([, a], [, b]) => b - a)
              .map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  {editingTag === tag ? (
                    <>
                      <Input
                        value={newTagName}
                        onChange={e => setNewTagName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            handleRenameTag(tag)
                          } else if (e.key === 'Escape') {
                            setEditingTag(null)
                            setNewTagName('')
                          }
                        }}
                        autoFocus
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleRenameTag(tag)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTag(null)
                          setNewTagName('')
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {tag}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} {count === 1 ? 'snippet' : 'snippets'}
                      </span>
                      <div className="ml-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTag(tag)
                            setNewTagName(tag)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteTag(tag)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => router.navigate({ to: '/' })}>
          Back to Snippets
        </Button>
      </div>
    </div>
  )
}
