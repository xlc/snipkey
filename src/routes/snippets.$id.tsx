import { parseTemplate, renderTemplate } from '@shared/template'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Copy, Download, FileCode, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PlaceholderEditor } from '~/components/PlaceholderEditor'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Textarea } from '~/components/ui/textarea'
import { usePlaceholderStorage } from '~/lib/hooks/usePlaceholderStorage'
import { deleteSnippet, getSnippet, updateSnippet } from '~/lib/snippet-api'

export const Route = createFileRoute('/snippets/$id')({
  component: SnippetDetail,
})

function SnippetDetail() {
  const router = useRouter()
  const { id } = Route.useParams()
  const [snippet, setSnippet] = useState<{
    id: string
    body: string
    tags: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingBody, setEditingBody] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
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
      router.navigate({ to: '/' })
      setLoading(false)
      return
    }

    setSnippet(result.data)
    setEditingBody(result.data.body)
    setLoading(false)
  }

  useEffect(() => {
    if (!snippet) return

    // Parse the editing body (not the saved body)
    const parseResult = parseTemplate(editingBody)

    // Render with current values
    const renderResult = renderTemplate(parseResult.segments, placeholderValues)
    setRendered(renderResult.rendered)
    setRenderErrors(!!renderResult.errors)
  }, [snippet, placeholderValues, editingBody])

  async function handleBlur() {
    if (!snippet || editingBody === snippet.body || isSaving) return

    setIsSaving(true)
    try {
      const result = await updateSnippet(id, { body: editingBody })
      if (result.error) {
        toast.error(result.error)
      } else {
        setSnippet({ ...snippet, body: editingBody })
        setLastSaved(new Date())
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopyRendered() {
    if (!snippet) return

    if (renderErrors) {
      toast.error('Please fix placeholder errors before copying')
      return
    }

    try {
      await navigator.clipboard.writeText(rendered)
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleCopyRaw() {
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(editingBody)
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleCopyUnrendered() {
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(rendered || snippet.body)
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
    a.download = `${snippet.body.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
    router.navigate({ to: '/' })
  }

  async function _handleUndo() {
    // Undo feature not implemented
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-6 bg-muted/50 rounded w-20" />
            <div className="h-6 bg-muted/50 rounded w-24" />
          </div>
          <div className="h-64 bg-muted/30 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!snippet) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <FileCode className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Snippet not found</h3>
        <p className="text-muted-foreground mb-6">The snippet you are looking for does not exist or has been deleted.</p>
        <Button asChild>
          <Link to="/">Go Back</Link>
        </Button>
      </div>
    )
  }

  // React Compiler automatically memoizes this
  const parseResult = snippet ? parseTemplate(snippet.body) : null

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="touch-manipulation">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {snippet.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {snippet.tags.map(tag => (
              <Badge key={tag} variant="outline" className="hover:bg-accent transition-colors cursor-default text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="touch-manipulation text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete snippet?</DialogTitle>
            <DialogDescription>Are you sure you want to delete this snippet? This action cannot be undone.</DialogDescription>
          </DialogHeader>

          {/* Snippet preview */}
          <div className="my-4 p-4 bg-muted rounded-lg border space-y-2">
            {snippet.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {snippet.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <pre className="whitespace-pre-wrap font-mono text-xs break-words max-h-40 overflow-auto">{editingBody}</pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <h2 className="text-base font-semibold">Rendered Output</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={renderErrors} className="touch-manipulation">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleCopyRendered} disabled={renderErrors} className="touch-manipulation cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />
                <span>Copy rendered output</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyRaw} className="touch-manipulation cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />
                <span>Copy raw template</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUnrendered} className="touch-manipulation cursor-pointer">
                <Copy className="h-4 w-4 mr-2" />
                <span>Copy unrendered template</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownload} className="touch-manipulation cursor-pointer">
                <Download className="h-4 w-4 mr-2" />
                <span>Download as file</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="p-4 bg-muted rounded-lg border">
          <pre className="whitespace-pre-wrap font-mono text-sm break-words">{rendered || editingBody}</pre>
        </div>
        {renderErrors && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
            Some placeholder values have errors. Please fix them before copying.
          </p>
        )}
      </div>

      {/* Inline editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Template</h2>
          {(isSaving || lastSaved) && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {isSaving ? (
                <>
                  <Save className="h-3 w-3 animate-pulse" />
                  Saving…
                </>
              ) : lastSaved ? (
                <>
                  <Save className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </>
              ) : null}
            </div>
          )}
        </div>
        <Textarea
          value={editingBody}
          onChange={e => setEditingBody(e.target.value)}
          onBlur={handleBlur}
          rows={10}
          className="font-mono text-sm"
          autoComplete="off"
        />
      </div>
    </div>
  )
}
