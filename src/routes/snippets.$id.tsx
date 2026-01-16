import { parseTemplate, renderTemplate } from '@shared/template'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Copy, Download, Trash2, Undo } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PlaceholderEditor } from '~/components/PlaceholderEditor'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { usePlaceholderStorage } from '~/lib/hooks/usePlaceholderStorage'
import { deleteSnippet, getSnippet } from '~/lib/snippet-api'

export const Route = createFileRoute('/snippets/$id')({
  component: SnippetDetail,
})

function SnippetDetail() {
  const router = useRouter()
  const { id } = Route.useParams()
  const [snippet, setSnippet] = useState<{
    id: string
    title: string
    body: string
    tags: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [rendered, setRendered] = useState('')
  const [renderErrors, setRenderErrors] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load placeholder values from localStorage
  const [placeholderValues, setPlaceholderValues] = usePlaceholderStorage(id, {})

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load on mount
  useEffect(() => {
    loadSnippet()
  }, [id])

  async function loadSnippet() {
    setLoading(true)
    const result = await getSnippet(id)

    if (result.error || !result.data) {
      toast.error(result.error || 'Failed to load snippet')
      router.navigate({ to: '/' })
      setLoading(false)
      return
    }

    setSnippet(result.data)
    setLoading(false)
  }

  useEffect(() => {
    if (!snippet) return

    // Parse the body
    const parseResult = parseTemplate(snippet.body)

    // Render with current values
    const renderResult = renderTemplate(parseResult.segments, placeholderValues)
    setRendered(renderResult.rendered)
    setRenderErrors(!!renderResult.errors)
  }, [snippet, placeholderValues])

  async function handleCopyRendered() {
    if (!snippet) return

    if (renderErrors) {
      toast.error('Cannot copy: placeholder values have errors')
      return
    }

    try {
      await navigator.clipboard.writeText(rendered)
      toast.success('Rendered output copied to clipboard!')
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleCopyRaw() {
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(snippet.body)
      toast.success('Raw template copied to clipboard!')
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleCopyUnrendered() {
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(rendered || snippet.body)
      toast.success('Unrendered template copied to clipboard!')
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleDownload() {
    if (!snippet) return

    const content = renderErrors ? snippet.body : rendered
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${snippet.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Snippet downloaded!')
  }

  async function handleDelete() {
    if (!snippet) return

    setIsDeleting(true)
    const result = await deleteSnippet(id)

    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
      setShowDeleteDialog(false)
      return
    }

    setShowDeleteDialog(false)

    // Store deleted snippet in sessionStorage for undo
    const deletedSnippet = {
      ...snippet,
      deletedAt: Date.now(),
    }
    sessionStorage.setItem('deleted_snippet', JSON.stringify(deletedSnippet))

    toast.success('Snippet deleted', {
      action: {
        label: (
          <span className="flex items-center gap-1">
            <Undo className="h-4 w-4" />
            Undo
          </span>
        ),
        onClick: () => handleUndo(),
      },
      duration: 10000,
    })

    router.navigate({ to: '/' })
  }

  async function handleUndo() {
    const deletedSnippetJson = sessionStorage.getItem('deleted_snippet')
    if (!deletedSnippetJson) return

    try {
      const _deletedSnippet = JSON.parse(deletedSnippetJson)

      // Navigate to edit page with the deleted snippet data
      // We'll need to implement a restore endpoint or use the create endpoint
      toast.info('Undo feature coming soon - snippet data preserved in session storage')
    } catch {
      // Invalid JSON in sessionStorage - corrupted data
      toast.error('Failed to undo deletion')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading snippet...</div>
  }

  if (!snippet) {
    return <div className="text-center py-12 text-muted-foreground">Snippet not found</div>
  }

  // React Compiler automatically memoizes this
  const parseResult = snippet ? parseTemplate(snippet.body) : null

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{snippet.title}</h1>
          {snippet.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {snippet.tags.map(tag => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/snippets/${id}/edit`}>Edit</a>
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete snippet?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{snippet.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Placeholder values */}
      {parseResult && parseResult.placeholders.length > 0 && (
        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h2 className="text-sm font-medium">Placeholder Values</h2>
          <p className="text-xs text-muted-foreground">Tap a placeholder to edit its value</p>
          <PlaceholderEditor placeholders={parseResult.placeholders} values={placeholderValues} onChange={setPlaceholderValues} />
        </div>
      )}

      {/* Rendered output */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Rendered Output</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={renderErrors}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyRendered}>
                <Copy className="h-4 w-4 mr-2" />
                Copy rendered output
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyRaw}>
                <Copy className="h-4 w-4 mr-2" />
                Copy raw template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUnrendered}>
                <Copy className="h-4 w-4 mr-2" />
                Copy unrendered template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download as file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <pre className="whitespace-pre-wrap font-mono text-sm">{rendered || snippet.body}</pre>
        </div>
        {renderErrors && <p className="text-sm text-destructive">Some placeholder values have errors. Please fix them before copying.</p>}
      </div>

      {/* Raw body */}
      <details className="space-y-2">
        <summary className="text-sm font-medium cursor-pointer">Raw Template</summary>
        <div className="p-4 bg-muted rounded-lg">
          <pre className="whitespace-pre-wrap font-mono text-xs">{snippet.body}</pre>
        </div>
      </details>
    </div>
  )
}
