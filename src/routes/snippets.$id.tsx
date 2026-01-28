import { parseTemplate, renderTemplate } from '@shared/template'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Copy, Download, FileCode, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PlaceholderEditor } from '~/components/PlaceholderEditor'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
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
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load placeholder values from localStorage
  const [placeholderValues, setPlaceholderValues] = usePlaceholderStorage(id, {})
  const mountedRef = useRef(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingSaveBodyRef = useRef<string | null>(null)

  // Track if component is mounted
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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

  // Parse the editing body in real-time
  const parseResult = useMemo(() => parseTemplate(editingBody), [editingBody])

  // Update rendered output when parseResult or placeholder values change
  useEffect(() => {
    const renderResult = renderTemplate(parseResult.segments, placeholderValues)
    setRendered(renderResult.rendered)
    setRenderErrors(!!renderResult.errors)
  }, [parseResult, placeholderValues])

  async function handleBlur() {
    if (!snippet || editingBody === snippet.body) return

    // Store the latest body to save
    const bodyToSave = editingBody
    pendingSaveBodyRef.current = bodyToSave

    // If already saving, the pending save will be handled after the current save completes
    if (isSaving) return

    setIsSaving(true)
    try {
      // Keep saving until there are no more pending changes
      while (pendingSaveBodyRef.current !== null && mountedRef.current) {
        const bodyToSaveNow = pendingSaveBodyRef.current
        pendingSaveBodyRef.current = null

        const result = await updateSnippet(id, { body: bodyToSaveNow })
        if (result.error) {
          toast.error(result.error)
          // Continue to process any pending saves that were queued during this failed save
          // Don't break - check if there are more pending saves in the next loop iteration
          continue
        }

        // Update state if component is still mounted
        if (mountedRef.current) {
          setSnippet(prev => (prev ? { ...prev, body: bodyToSaveNow } : prev))
          setLastSaved(new Date())
        }

        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      // Only set saving to false if component is still mounted
      if (mountedRef.current) {
        setIsSaving(false)
      }
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
      toast.success('Output copied to clipboard')
    } catch {
      // Clipboard API failed (user denied permission or browser doesn't support it)
      toast.error('Failed to copy to clipboard')
    }
  }

  async function handleCopyRaw() {
    if (!snippet) return

    try {
      await navigator.clipboard.writeText(editingBody)
      toast.success('Template copied to clipboard')
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

  function handleNavigateWithCheck(to: string) {
    if (hasUnsavedChanges) {
      setPendingNavigateTo(to)
      setShowUnsavedDialog(true)
    } else {
      router.navigate({ to })
    }
  }

  function handleConfirmNavigate() {
    setShowUnsavedDialog(false)
    if (pendingNavigateTo) {
      router.navigate({ to: pendingNavigateTo })
      setPendingNavigateTo(null)
    }
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = snippet ? editingBody !== snippet.body : false

  // Warn before navigation with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Chrome requires returnValue to be set
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleNavigateWithCheck('/')}
          className="touch-manipulation h-11 w-11 sm:h-9 sm:w-9 px-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {snippet.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {snippet.tags.map(tag => (
              <Badge key={tag} variant="outline" className="hover:bg-accent transition-colors cursor-default text-xs sm:text-xs">
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
          className="touch-manipulation h-11 w-11 sm:h-9 sm:w-9 px-0 text-muted-foreground hover:text-destructive"
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

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>You have unsaved changes. Do you want to save them before leaving?</DialogDescription>
          </DialogHeader>

          {/* Form preview */}
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
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              Stay
            </Button>
            <Button variant="destructive" onClick={handleConfirmNavigate}>
              Leave without saving
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Rendered Output</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRendered} disabled={renderErrors} className="touch-manipulation">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="touch-manipulation">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          </div>
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Template</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRaw} className="touch-manipulation">
              <Copy className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Copy template</span>
              <span className="sm:hidden">Template</span>
            </Button>
            {(isSaving || lastSaved || hasUnsavedChanges) && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                {isSaving ? (
                  <>
                    <Save className="h-3 w-3 animate-pulse" />
                    Saving…
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                    Unsaved changes
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
        </div>
        <Textarea
          ref={textareaRef}
          value={editingBody}
          onChange={e => setEditingBody(e.target.value)}
          onBlur={handleBlur}
          rows={10}
          className="font-mono text-sm"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="mt-4 rounded-lg border p-4 bg-muted/50 space-y-3">
          <h3 className="text-sm font-medium">💡 Placeholder Syntax Guide</h3>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Use placeholders to create dynamic snippets:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name}}'}</code> - Text placeholder
              </li>
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name:text}}'}</code> - Text with type
              </li>
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name:text=default}}'}</code> - Text with default value
              </li>
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name:number}}'}</code> - Number input
              </li>
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name:number=30}}'}</code> - Number with default
              </li>
              <li>
                <code className="bg-background px-1.5 py-0.5 rounded">{'{{name:enum(a,b,c)}}'}</code> - Dropdown options
              </li>
            </ul>
            <p className="text-[11px]">
              Try:{' '}
              <code>
                Hello {'{{name:text=World}}'}, you are {'{{age:number=30}}'}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
