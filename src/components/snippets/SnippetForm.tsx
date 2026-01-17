import { parseTemplate } from '@shared/template'
import { LIMITS } from '@shared/validation/limits'
import { useRouter } from '@tanstack/react-router'
import { Folder, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { FolderSelector } from '~/components/FolderSelector'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

export interface SnippetFormProps {
  mode: 'create' | 'edit'
  id?: string
  initialTitle?: string
  initialBody?: string
  initialTags?: string[]
  onSubmit: (data: { title: string; body: string; tags: string[] }) => Promise<void>
  enableAutoSave?: boolean
}

export function SnippetForm({
  mode,
  id,
  initialTitle = '',
  initialBody = '',
  initialTags = [],
  onSubmit,
  enableAutoSave = true,
}: SnippetFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialTags)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const formStateRef = useRef({ title, body, tags, folderId })

  // Real-time parsing
  const parseResult = parseTemplate(body)

  // Check if form has unsaved changes (memoized to prevent recomputation)
  const hasUnsavedChanges = useMemo(
    () =>
      title.trim() !== initialTitle ||
      body.trim() !== initialBody ||
      tags.length !== initialTags.length ||
      tags.some((t, i) => t !== initialTags[i]) ||
      folderId !== (null as unknown), // TODO: fix this type issue
    [title, body, tags, initialTitle, initialBody, initialTags, folderId],
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
    const formState = { title, body, tags }

    // Save to localStorage whenever form changes
    localStorage.setItem(draftKey, JSON.stringify(formState))

    // Update ref for auto-save comparison
    formStateRef.current = formState
  }, [title, body, tags, mode, id, enableAutoSave])

  // Load draft on mount
  useEffect(() => {
    if (!enableAutoSave) return

    const draftKey = mode === 'edit' ? `draft-edit-${id}` : 'draft-new'
    const draftJson = localStorage.getItem(draftKey)

    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson)
        // Only restore if it's different from initial values
        if (draft.title !== initialTitle || draft.body !== initialBody || JSON.stringify(draft.tags) !== JSON.stringify(initialTags)) {
          setTitle(draft.title || '')
          setBody(draft.body || '')
          setTags(draft.tags || [])
          toast.info('Draft restored from local storage', {
            duration: 3000,
            action: {
              label: 'Clear',
              onClick: () => {
                localStorage.removeItem(draftKey)
                setTitle(initialTitle)
                setBody(initialBody)
                setTags(initialTags)
              },
            },
          })
        }
      } catch {
        // Invalid draft data in localStorage - continue with empty form
      }
    }
  }, [mode, id, enableAutoSave, initialTitle, initialBody, initialTags])

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
      if (
        title.trim() &&
        body.trim() &&
        (title !== initialTitle || body !== initialBody || JSON.stringify(tags) !== JSON.stringify(initialTags))
      ) {
        setSaving(true)
        try {
          await onSubmit({
            title: title.trim(),
            body,
            tags,
          })
          setLastSaved(new Date())
        } catch {
          // Error already handled and displayed via toast notification in onSubmit
        } finally {
          setSaving(false)
        }
      }
    }, 2000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [title, body, tags, enableAutoSave, mode, loading, onSubmit, initialTitle, initialBody, initialTags])

  // Clear draft on successful submit
  useEffect(() => {
    if (loading) return // Don't clear while loading

    const draftKey = mode === 'edit' ? `draft-edit-${id}` : 'draft-new'

    // Clear draft if form matches initial values (successful save)
    if (title === initialTitle && body === initialBody && JSON.stringify(tags) === JSON.stringify(initialTags)) {
      localStorage.removeItem(draftKey)
    }
  }, [title, body, tags, initialTitle, initialBody, initialTags, mode, id, loading])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!body.trim()) {
      toast.error('Body is required')
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
        title: title.trim(),
        body,
        tags,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{mode === 'create' ? 'New Snippet' : 'Edit Snippet'}</h2>
            <p className="text-muted-foreground mt-2">
              {mode === 'create' ? 'Create a new snippet with placeholders for dynamic values' : 'Update your snippet with placeholders'}
            </p>
          </div>
          {enableAutoSave && mode === 'edit' && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
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
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <Input id="title" placeholder="My snippet" value={title} onChange={e => setTitle(e.target.value)} required autoComplete="off" />
        </div>

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
            Use {'{{name:text}}'} for text, {'{{age:number}}'} for numbers, or {'{{tone:enum(formal,casual)}}'} for enums
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
                  return
                }
              }
              if (mode === 'create') {
                router.navigate({ to: '/' })
              } else if (id) {
                router.navigate({ to: '/snippets/$id', params: { id } })
              }
            }}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
