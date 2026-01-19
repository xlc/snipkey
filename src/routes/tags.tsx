import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Edit2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { listSnippets, updateSnippet } from '~/lib/snippet-api'
import { tagsList } from '~/server/tags'

export const Route = createFileRoute('/tags')({
  component: TagsPage,
})

function TagsPage() {
  const router = useRouter()
  const [tags, setTags] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [tagToDelete, setTagToDelete] = useState<string | null>(null)

  const loadTags = useCallback(async () => {
    setLoading(true)
    const result = await tagsList({})

    if (result.error) {
      toast.error(result.error.message)
      setLoading(false)
      return
    }

    if (!result.data) {
      toast.error('Failed to load tags')
      setLoading(false)
      return
    }

    // Convert array to map for easier manipulation
    const tagCounts = new Map<string, number>()
    for (const { tag, count } of result.data.tags) {
      tagCounts.set(tag, count)
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

    // Get all snippets with the old tag (server-side filtering)
    const result = await listSnippets({ tag: oldTag, limit: 10000 })
    if (result.error || !result.data) {
      toast.error('Failed to load snippets')
      return
    }

    // Check if we hit the limit
    if (result.data.length >= 10000) {
      toast.warning('You have a large number of snippets with this tag. Processing may take a moment.')
    }

    const snippetsToUpdate = result.data

    if (snippetsToUpdate.length === 0) {
      toast.error('No snippets found with this tag')
      return
    }

    // Update each snippet in parallel batches
    let updated = 0
    let failed = 0

    // Process in batches of 10 to avoid overwhelming the server
    const batchSize = 10
    for (let i = 0; i < snippetsToUpdate.length; i += batchSize) {
      const batch = snippetsToUpdate.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(snippet => {
          const newTags = (snippet.tags ?? []).map(t => (t === oldTag ? newTag : t))
          return updateSnippet(snippet.id, { tags: newTags })
        }),
      )

      results.forEach(result => {
        if (result.error) {
          failed++
        } else {
          updated++
        }
      })
    }

    if (failed > 0) {
      toast.error(`Failed to update ${failed} snippet${failed === 1 ? '' : 's'}`)
      return
    }

    toast.success(`Renamed tag in ${updated} snippet${updated === 1 ? '' : 's'}`)
    setEditingTag(null)
    setNewTagName('')
    loadTags()
  }

  async function handleDeleteTag(tag: string) {
    setTagToDelete(tag)
    setShowDeleteDialog(true)
  }

  async function confirmDeleteTag() {
    if (!tagToDelete) return

    // Get all snippets with the tag (server-side filtering)
    const result = await listSnippets({ tag: tagToDelete, limit: 10000 })
    if (result.error || !result.data) {
      toast.error('Failed to load snippets')
      setShowDeleteDialog(false)
      return
    }

    // Check if we hit the limit
    if (result.data.length >= 10000) {
      toast.warning('You have a large number of snippets with this tag. Processing may take a moment.')
    }

    const snippetsToUpdate = result.data

    if (snippetsToUpdate.length === 0) {
      toast.error('No snippets found with this tag')
      setShowDeleteDialog(false)
      return
    }

    // Update each snippet to remove the tag
    let updated = 0
    let failed = 0

    for (const snippet of snippetsToUpdate) {
      const newTags = (snippet.tags ?? []).filter(t => t !== tagToDelete)
      const updateResult = await updateSnippet(snippet.id, { tags: newTags })

      if (updateResult.error) {
        failed++
      } else {
        updated++
      }
    }

    if (failed > 0) {
      toast.error(`Failed to update ${failed} snippet${failed === 1 ? '' : 's'}`)
      setShowDeleteDialog(false)
      return
    }

    toast.success(`Removed tag from ${updated} snippet${updated === 1 ? '' : 's'}`)
    setShowDeleteDialog(false)
    setTagToDelete(null)
    loadTags()
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
                        className="flex-1"
                        autoComplete="off"
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tagToDelete}"? This will remove it from all snippets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTag} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
