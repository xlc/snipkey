import { parseTemplate } from '@shared/template'
import { LIMITS } from '@shared/validation/limits'
import { useRouter } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FolderDialog } from '~/components/FolderDialog'
import { FolderSelector } from '~/components/FolderSelector'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

export interface SnippetFormProps {
  mode: 'create' | 'edit'
  id?: string
  initialBody?: string
  initialTags?: string[]
  initialFolderId?: string | null
  onSubmit: (data: { body: string; tags: string[]; folder_id?: string | null }) => Promise<void>
  enableAutoSave?: boolean
}

export function SnippetForm({
  mode,
  id,
  initialBody = '',
  initialTags = [],
  initialFolderId = null,
  onSubmit,
  enableAutoSave = true,
}: SnippetFormProps) {
  const router = useRouter()
  const [body, setBody] = useState(initialBody)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialTags)
  const [folderId, setFolderId] = useState<string | null>(initialFolderId)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [folderListKey, setFolderListKey] = useState(0) // Used to force FolderSelector reload
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formStateRef = useRef({ body, tags, folderId })
  const mountedRef = useRef(true) // Track if component is mounted

  // Real-time parsing
  const parseResult = parseTemplate(body)

  // Check if form has unsaved changes (memoized to prevent recomputation)
  const hasUnsavedChanges = useMemo(
    () =>
      body !== initialBody ||
      tags.length !== initialTags.length ||
      tags.some((t, i) => t !== initialTags[i]) ||
      folderId !== initialFolderId,
    [body, tags, initialBody, initialTags, initialFolderId, folderId],
  )

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

  // Save draft to localStorage
  useEffect(() => {
    if (!enableAutoSave) return

    const draftKey = mode === 'edit' ? `draft-edit-${id}` : 'draft-new'
    const formState = { body, tags, folderId }

    // Save to localStorage whenever form changes
    localStorage.setItem(draftKey, JSON.stringify(formState))

    // Update ref for auto-save comparison
    formStateRef.current = formState
  }, [body, tags, mode, id, enableAutoSave, folderId])

  // Load draft on mount
  useEffect(() => {
    if (!enableAutoSave) return

    const draftKey = mode === 'edit' ? `draft-edit-${id}` : 'draft-new'
    const draftJson = localStorage.getItem(draftKey)

    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson)
        // Only restore if it's different from initial values
        if (
          draft.body !== initialBody ||
          JSON.stringify(draft.tags) !== JSON.stringify(initialTags) ||
          draft.folderId !== initialFolderId
        ) {
          setBody(draft.body || '')
          setTags(draft.tags || [])
          setFolderId(draft.folderId || null)
        }
      } catch {
        // Invalid draft data in localStorage - continue with empty form
      }
    }
  }, [mode, id, enableAutoSave, initialBody, initialTags, initialFolderId])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Track latest onSubmit handler using ref to avoid useEffect dependency issues
  const onSubmitRef = useRef(onSubmit)

  // Update ref when onSubmit changes
  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

  // Auto-save to server after 2 seconds of inactivity (edit mode only)
  useEffect(() => {
    if (!enableAutoSave || mode !== 'edit' || loading) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Only save if something changed and form is valid
      if (body.trim() && (body !== initialBody || JSON.stringify(tags) !== JSON.stringify(initialTags) || folderId !== initialFolderId)) {
        setSaving(true)
        try {
          await onSubmitRef.current({
            body,
            tags,
            folder_id: folderId,
          })
          // Only update lastSaved time if submission succeeded and component is still mounted
          if (mountedRef.current) {
            setLastSaved(new Date())
          }
        } catch {
          // Error already handled and displayed via toast notification in onSubmit
          // Don't update lastSaved since the save failed
        } finally {
          // Only set saving to false if component is still mounted
          if (mountedRef.current) {
            setSaving(false)
          }
        }
      }
    }, 2000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [body, tags, folderId, enableAutoSave, mode, loading, initialBody, initialTags, initialFolderId])

  // Clear draft on successful submit
  useEffect(() => {
    if (loading) return // Don't clear while loading

    const draftKey = mode === 'edit' ? `draft-edit-${id}` : 'draft-new'

    // Clear draft if form matches initial values (successful save)
    if (body === initialBody && JSON.stringify(tags) === JSON.stringify(initialTags) && folderId === initialFolderId) {
      localStorage.removeItem(draftKey)
    }
  }, [body, tags, folderId, initialBody, initialTags, initialFolderId, mode, id, loading])

  function handleAddTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  function handleCancel() {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    } else {
      // No unsaved changes, navigate directly
      if (mode === 'create') {
        router.navigate({ to: '/' })
      } else if (id) {
        router.navigate({ to: '/snippets/$id', params: { id } })
      }
    }
  }

  function handleConfirmLeave() {
    setShowUnsavedDialog(false)
    if (mode === 'create') {
      router.navigate({ to: '/' })
    } else if (id) {
      router.navigate({ to: '/snippets/$id', params: { id } })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!body.trim()) {
      return
    }

    // Validate placeholder count
    const parseResult = parseTemplate(body)
    if (parseResult.placeholders.length > LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET) {
      toast.error(`Maximum ${LIMITS.MAX_PLACEHOLDERS_PER_SNIPPET} placeholders allowed`)
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        body,
        tags,
        folder_id: folderId,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Auto-save indicator - sticky on mobile */}
      {enableAutoSave && mode === 'edit' && (saving || lastSaved) && (
        <div className="sm:hidden sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-2 px-3 rounded-lg">
          <div className="text-sm font-medium flex items-center justify-center gap-2">
            {saving ? (
              <>
                <Save className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-primary">Saving…</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 text-green-600 dark:text-green-500" />
                <span className="text-green-600 dark:text-green-500">Saved {lastSaved?.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{mode === 'create' ? 'New Snippet' : 'Edit Snippet'}</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {mode === 'create' ? 'Create a new snippet with placeholders for dynamic values' : 'Update your snippet with placeholders'}
            </p>
          </div>
          {enableAutoSave && mode === 'edit' && (
            <div className="hidden sm:block text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              {saving ? (
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="body" className="text-sm font-medium">
            Body <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="body"
            placeholder="Hello {{name:text=World}}, you are {{age:number=30}} years old."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            required
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Use {'{{name}}'} for text, {'{{name=default}}'} for text with default, {'{{name:number}}'} for numbers
          </p>
        </div>

        {/* Parsing feedback */}
        {body && (parseResult.placeholders.length > 0 || parseResult.errors.length > 0) && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-medium">Placeholders Found</h3>
            {parseResult.placeholders.length > 0 ? (
              <div className="space-y-2">
                {parseResult.placeholders.map(ph => (
                  <div key={ph.name} className="flex items-center gap-2">
                    <Badge variant="secondary">{ph.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {ph.phType}
                      {ph.options && ` (${ph.options.join(', ')})`}
                      {ph.defaultValue !== undefined && ` = "${ph.defaultValue}"`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No placeholders detected</p>
            )}

            {parseResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive">Errors</h4>
                {parseResult.errors.map(error => (
                  <p key={error.start} className="text-sm text-destructive">
                    {error.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Folder (optional)</div>
          <FolderSelector
            key={folderListKey}
            selectedFolderId={folderId}
            onFolderSelect={setFolderId}
            onCreateFolder={() => setShowFolderDialog(true)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tags" className="text-sm font-medium">
            Tags (optional)
          </label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add a tag..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              autoComplete="off"
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" interactive onClick={() => handleRemoveTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : mode === 'create' ? 'Create Snippet' : 'Update Snippet'}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Folder Dialog */}
      <FolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        mode="create"
        parent_id={null}
        onSuccess={() => {
          // Folder was created successfully, force FolderSelector to reload
          setFolderListKey(prev => prev + 1)
          setShowFolderDialog(false)
        }}
      />

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>You have unsaved changes. Are you sure you want to leave? Your changes will be lost.</DialogDescription>
          </DialogHeader>

          {/* Form preview */}
          <div className="my-4 p-4 bg-muted rounded-lg border space-y-2">
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <pre className="whitespace-pre-wrap font-mono text-xs break-words max-h-40 overflow-auto">{body}</pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              Stay
            </Button>
            <Button variant="destructive" onClick={handleConfirmLeave}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
