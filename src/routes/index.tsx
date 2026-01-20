import { parseTemplate, renderTemplate } from '@shared/template'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Clock, Copy, Edit2, FileCode, Folder, FolderPlus, Plus, Search, Trash2, X } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FolderDialog } from '~/components/FolderDialog'
import { FolderTree } from '~/components/FolderTree'
import { KeyboardShortcutsHelp } from '~/components/KeyboardShortcutsHelp'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { COLORS } from '~/lib/constants/colors'
import { useDebounce } from '~/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '~/lib/hooks/useKeyboardShortcuts'
import { useMediaQuery } from '~/lib/hooks/useMediaQuery'
import { useAuthSync, useStorageListener } from '~/lib/hooks/useStorageListener'
import type { FolderTreeItem } from '~/lib/server/folders'
import {
  createSnippet,
  deleteSnippet,
  getAuthStatus,
  isValidSnippet,
  listSnippets,
  type PartialSnippet,
  type ValidatedSnippet,
} from '~/lib/snippet-api'
import { foldersTree } from '~/server/folders'

export const Route = createFileRoute('/')({
  component: Index,
})

// Hoist loading skeleton outside component to prevent recreation on every render
const LOADING_SKELETON = (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="p-4 border rounded-lg animate-pulse">
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted/50 rounded w-2/3 mb-3" />
        <div className="flex gap-2">
          <div className="h-5 bg-muted/30 rounded w-16" />
          <div className="h-5 bg-muted/30 rounded w-20" />
        </div>
      </div>
    ))}
  </div>
)

// Format timestamp to relative time (hoisted outside component to preserve memo)
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Memoized snippet row component
interface SnippetRowProps {
  snippet: ValidatedSnippet
  folders: Map<string, { name: string; color: string }>
  onTagClick: (tag: string) => void
  formatRelativeTime: (timestamp: number) => string
  onDelete?: (id: string) => void
}

const SnippetRow = memo(({ snippet, folders, onTagClick, formatRelativeTime, onDelete }: SnippetRowProps) => {
  const parseResult = useMemo(() => parseTemplate(snippet.body), [snippet.body])
  const [_copying, setCopying] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const _router = useRouter()

  // Get rendered output (with default empty placeholder values)
  const rendered = useMemo(() => {
    const renderResult = renderTemplate(parseResult.segments, {})
    return renderResult.rendered
  }, [parseResult.segments])

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      try {
        await navigator.clipboard.writeText(rendered)
        setCopying(true)
        toast.success('Copied to clipboard')
        setTimeout(() => setCopying(false), 1000)
      } catch {
        toast.error('Failed to copy to clipboard')
      }
    },
    [rendered],
  )

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    const result = await deleteSnippet(snippet.id)

    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
      setShowDeleteDialog(false)
      return
    }

    setShowDeleteDialog(false)
    onDelete?.(snippet.id)
    toast.success('Snippet deleted')
  }, [snippet.id, onDelete])

  return (
    <>
      <div className="group relative border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 bg-card animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
          {/* Folder badge */}
          {snippet.folder_id && folders.has(snippet.folder_id) && (
            <Badge
              variant="outline"
              className="text-xs mb-1"
              style={{ backgroundColor: `${COLORS[folders.get(snippet.folder_id)?.color ?? 'gray']}20` }}
            >
              <Folder className="h-3 w-3 mr-1" />
              {folders.get(snippet.folder_id)?.name}
            </Badge>
          )}

          {/* Body - clickable to view detail */}
          <Link to="/snippets/$id" params={{ id: snippet.id }} className="block">
            <div className="text-left cursor-pointer hover:bg-muted/100 rounded p-2 -m-2 transition-colors" title="Click to view snippet">
              <p className="text-sm text-foreground whitespace-pre-wrap font-mono break-words">{snippet.body}</p>
            </div>
          </Link>

          {/* Metadata row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(snippet.updated_at)}</span>
              </div>

              {/* Tags */}
              {snippet.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {snippet.tags.slice(0, 3).map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      interactive
                      onClick={e => {
                        e.stopPropagation()
                        onTagClick(tag)
                      }}
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {snippet.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{snippet.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons - always visible on mobile, hover on desktop */}
            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} title="Copy">
                <Copy className="h-4 w-4" />
              </Button>
              {snippet.id.startsWith('temp-') ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 pointer-events-none" title="Edit (saving...)">
                  <Edit2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to="/snippets/$id/edit" params={{ id: snippet.id }} title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
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
            <pre className="whitespace-pre-wrap font-mono text-xs break-words max-h-40 overflow-auto">{snippet.body}</pre>
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
    </>
  )
})
SnippetRow.displayName = 'SnippetRow'

function Index() {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [snippets, setSnippets] = useState<Array<PartialSnippet> | null>(null)
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [inputMode, setInputMode] = useState<'search' | 'create'>('search')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'body'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [authenticated, setAuthenticated] = useState(false)
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([])
  const [folderTreeLoading, setFolderTreeLoading] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderDialogParentId, setFolderDialogParentId] = useState<string | null>(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [createTags, setCreateTags] = useState<string[]>([])
  const [createTagInput, setCreateTagInput] = useState('')
  const [createFolderId, setCreateFolderId] = useState<string | null>(null)
  const [hadNoResults, setHadNoResults] = useState(false)
  const [previousQueryLength, setPreviousQueryLength] = useState(0)
  const [creatingSnippetId, setCreatingSnippetId] = useState<string | null>(null)

  // Derive search query from input when in search mode
  const searchQuery = inputMode === 'search' ? inputValue : ''

  // Derive create body from input when in create mode
  const createBody = inputMode === 'create' ? inputValue : ''

  // Debounce search input to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      const status = await getAuthStatus()
      setAuthenticated(status.authenticated)
    }
    checkAuth()
  }, [])

  // Re-check auth status when page becomes visible (handles redirect from login/register)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getAuthStatus().then(status => {
          setAuthenticated(status.authenticated)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Sync authentication state across tabs
  useAuthSync(userId => {
    setAuthenticated(userId !== null)
  })

  const loadSnippets = useCallback(async () => {
    setLoading(true)

    // Parallel fetch: start all requests at once (async-parallel rule)
    const snippetsPromise = listSnippets({
      limit: 20,
      query: debouncedSearchQuery || undefined,
      tag: selectedTag || undefined,
      folder_id: selectedFolderId || undefined,
      sortBy,
      sortOrder,
    })

    // Load folder tree with loading state
    const loadFolders = async () => {
      if (!authenticated) {
        return { error: null, data: null }
      }
      setFolderTreeLoading(true)
      try {
        const result = await foldersTree({})
        setFolderTreeLoading(false)
        return { error: null, data: result.data }
      } catch {
        setFolderTreeLoading(false)
        return { error: null, data: null }
      }
    }

    const [snippetsResult, foldersResult] = await Promise.all([snippetsPromise, loadFolders()])

    if (snippetsResult.error) {
      setLoading(false)
      return
    }

    const items = snippetsResult.data || []

    // Load folder tree
    if (authenticated && foldersResult?.data) {
      setFolderTree(foldersResult.data.tree)
    } else {
      setFolderTree([])
    }

    // Preserve optimistic snippet if we're creating one
    if (creatingSnippetId) {
      const optimisticSnippet = snippets?.find(s => s.id === creatingSnippetId)
      if (optimisticSnippet) {
        setSnippets(optimisticSnippet ? [optimisticSnippet, ...items] : items)
      } else {
        setSnippets(items)
      }
    } else {
      setSnippets(items)
    }

    // Track if we had no results from search
    const hasNoResults = items.length === 0 && debouncedSearchQuery.length > 0
    setHadNoResults(hasNoResults)
    setPreviousQueryLength(debouncedSearchQuery.length)

    // Add a small delay for smoother transitions
    setTimeout(() => setLoading(false), 100)
  }, [authenticated, debouncedSearchQuery, selectedFolderId, selectedTag, sortBy, sortOrder, creatingSnippetId, snippets])

  // Listen for localStorage changes from other tabs to keep UI in sync
  useStorageListener('snipkey_meta', () => {
    // Reload snippets when metadata changes (e.g., authentication, sync status)
    loadSnippets()
  })

  // Auto-switch to create mode when user continues typing after no results
  useEffect(() => {
    // Only trigger if: we had no results, user is adding more text, and we're in search mode
    if (hadNoResults && inputMode === 'search' && searchQuery.length > previousQueryLength && searchQuery.length > 0) {
      // Switch to create mode and keep the search query as the snippet content
      setInputMode('create')
      setHadNoResults(false) // Reset so we don't keep triggering
    }
  }, [hadNoResults, inputMode, searchQuery.length, previousQueryLength, searchQuery])

  // Build folder map once for efficient lookup (memoized to prevent rebuilding on every render)
  const foldersMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    const addToMap = (items: FolderTreeItem[]) => {
      for (const item of items) {
        map.set(item.id, { name: item.name, color: item.color })
        if (item.children.length > 0) addToMap(item.children)
      }
    }
    addToMap(folderTree)
    return map
  }, [folderTree])

  const handleCreate = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      // Use inputValue directly instead of createBody to support creating from search mode
      if (!inputValue.trim()) return

      // Use the currently selected folder (if any) for the new snippet
      const folderId = createFolderId ?? selectedFolderId

      // Create optimistic snippet
      const tempId = `temp-${Date.now()}`
      const optimisticSnippet: ValidatedSnippet = {
        id: tempId,
        body: inputValue.trim(),
        tags: createTags,
        folder_id: folderId,
        created_at: Date.now(),
        updated_at: Date.now(),
        synced: false,
      }

      // Reset form immediately
      setInputValue('')
      setInputMode('search')
      setCreateTags([])
      setCreateTagInput('')
      setCreateFolderId(null)

      // Mark as creating to prevent reload from overwriting optimistic snippet
      setCreatingSnippetId(tempId)

      // Optimistically add to list
      setSnippets(prev => [optimisticSnippet, ...(prev ?? [])])

      try {
        const result = await createSnippet({
          body: optimisticSnippet.body,
          tags: optimisticSnippet.tags,
          folder_id: optimisticSnippet.folder_id,
        })

        if (result.error) {
          // Remove optimistic snippet and show error
          setSnippets(prev => prev?.filter(s => s.id !== tempId) ?? null)
          toast.error(result.error)
          // Restore form
          setInputValue(optimisticSnippet.body)
          setInputMode('create')
          setCreateTags(optimisticSnippet.tags)
          setCreateFolderId(optimisticSnippet.folder_id)
          setCreatingSnippetId(null)
          return
        }

        // Replace optimistic snippet with real one (synced only if authenticated)
        if (result.data?.id) {
          const realId = result.data.id
          setSnippets(
            prev => prev?.map(s => (s.id === tempId ? ({ ...s, id: realId, synced: authenticated } as PartialSnippet) : s)) ?? null,
          )
        }
        // Clear creating flag after successful creation
        setCreatingSnippetId(null)
      } catch {
        // Remove optimistic snippet on error
        setSnippets(prev => prev?.filter(s => s.id !== tempId) ?? null)
        toast.error('Failed to create snippet')
        // Restore form
        setInputValue(optimisticSnippet.body)
        setInputMode('create')
        setCreateTags(optimisticSnippet.tags)
        setCreateFolderId(optimisticSnippet.folder_id)
        setCreatingSnippetId(null)
      }
    },
    [inputValue, createTags, createFolderId, selectedFolderId, authenticated],
  )

  const handleAddCreateTag = useCallback(
    (e?: React.KeyboardEvent) => {
      const tag = createTagInput.trim()
      if (!tag) return
      if (e && e.key !== 'Enter') return
      if (createTags.includes(tag)) {
        toast.error('Tag already exists')
        return
      }
      if (createTags.length >= 10) {
        toast.error('Maximum 10 tags allowed')
        return
      }
      setCreateTags(prev => [...prev, tag])
      setCreateTagInput('')
    },
    [createTagInput, createTags],
  )

  const handleRemoveCreateTag = useCallback((tag: string) => {
    setCreateTags(prev => prev.filter(t => t !== tag))
  }, [])

  const handleDeleteSnippet = useCallback((id: string) => {
    setSnippets(prev => prev?.filter((s: PartialSnippet) => s.id !== id) ?? null)
  }, [])

  const handleClearInput = useCallback(() => {
    setInputValue('')
    setInputMode('search')
    setHadNoResults(false)
  }, [])

  // Keyboard shortcuts (disabled on mobile)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const keyboardShortcuts = useMemo(
    () =>
      isMobile
        ? []
        : [
            {
              key: 'n',
              ctrlKey: true,
              handler: () => {
                setInputMode('create')
                inputRef.current?.focus()
              },
              description: 'Focus create input',
            },
            {
              key: '/',
              handler: () => {
                setInputMode('search')
                inputRef.current?.focus()
              },
              description: 'Focus search input',
            },
            {
              key: 'Escape',
              handler: () => {
                if (inputMode === 'create' && createBody) {
                  setInputValue('')
                  setInputMode('search')
                } else if (searchQuery) {
                  setInputValue('')
                } else if (selectedTag) {
                  setSelectedTag(null)
                }
              },
              description: 'Clear filters',
            },
          ],
    [isMobile, inputMode, createBody, searchQuery, selectedTag],
  )
  useKeyboardShortcuts(keyboardShortcuts)

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-load when search, tag, sort, sortBy, sortOrder, or auth changes
  useEffect(() => {
    loadSnippets()
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder, authenticated])

  return (
    <div className="flex gap-6">
      {/* Folder Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Folders</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFolderDialogParentId(null)
                setShowFolderDialog(true)
              }}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          {folderTree.length > 0 || authenticated || folderTreeLoading ? (
            <FolderTree
              tree={folderTree}
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              onCreateFolder={parentId => {
                setFolderDialogParentId(parentId)
                setShowFolderDialog(true)
              }}
              onEditFolder={() => {}}
              onDeleteFolder={() => {}}
              loading={folderTreeLoading}
            />
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No folders yet. Create your first folder to organize your snippets!
            </div>
          )}

          {/* "All Snippets" option */}
          {selectedFolderId !== null && (
            <Button variant="ghost" className="w-full justify-start" onClick={() => setSelectedFolderId(null)}>
              <FileCode className="h-4 w-4 mr-2" />
              All Snippets
            </Button>
          )}
        </div>
      </aside>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts} />

      {/* Main Content */}
      <div className="flex-1 space-y-3 sm:space-y-6">
        {/* Unified Input - acts as both search and create */}
        <div className="space-y-3">
          <div className="relative">
            {inputMode === 'search' ? (
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            ) : (
              <Plus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            )}
            <Textarea
              ref={inputRef}
              placeholder={inputMode === 'search' ? 'Search snippets… (/ to focus)' : 'Type your snippet here… (Ctrl+N to focus)'}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              rows={inputMode === 'create' ? 4 : 1}
              className={`resize-none ${inputMode === 'search' ? 'pl-10 pr-20 min-h-[38px]' : 'pl-10 pr-20'}`}
              autoComplete="off"
            />
            <div className="absolute right-2 top-2 flex gap-1">
              {inputMode === 'search' ? (
                <>
                  {/* In search mode: Create button creates immediately, toggle button switches mode */}
                  {inputValue.trim() ? (
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      title="Create snippet now"
                    >
                      Create
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode('create')
                        setHadNoResults(false)
                        inputRef.current?.focus()
                      }}
                      className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                      title="Switch to create mode"
                    >
                      Create
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* In create mode: Search button goes back, can still add tags */}
                  <button
                    type="button"
                    onClick={() => setInputMode('search')}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors"
                    title="Switch to search mode"
                  >
                    Search
                  </button>
                </>
              )}
              {inputValue && (
                <button type="button" onClick={handleClearInput} className="text-muted-foreground hover:text-foreground p-1" title="Clear">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Create mode options - only shown in create mode */}
          {inputMode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Tags */}
              {createTags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {createTags.map(tag => (
                    <Badge key={tag} variant="secondary" interactive onClick={() => handleRemoveCreateTag(tag)} className="text-xs">
                      {tag}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add tag input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag... (optional, press Enter)"
                  value={createTagInput}
                  onChange={e => setCreateTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCreateTag(e)
                    }
                  }}
                  className="flex-1"
                />
                <Button type="submit" disabled={!createBody.trim()} className="px-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Filters row */}
        {(selectedTag || selectedFolderId || sortBy !== 'updated' || sortOrder !== 'desc') && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTag && (
              <Badge variant="secondary" interactive onClick={() => setSelectedTag(null)} className="gap-1">
                Tag: {selectedTag}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {selectedFolderId && foldersMap.has(selectedFolderId) && (
              <Badge variant="secondary" interactive onClick={() => setSelectedFolderId(null)} className="gap-1">
                {foldersMap.get(selectedFolderId)?.name}
                <X className="h-3 w-3" />
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTag(null)
                setSelectedFolderId(null)
                setSortBy('updated')
                setSortOrder('desc')
                setHadNoResults(false)
              }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Snippets List */}
        {loading ? (
          LOADING_SKELETON
        ) : snippets && snippets.length > 0 ? (
          <div className="space-y-2">
            {snippets.filter(isValidSnippet).map(snippet => (
              <SnippetRow
                key={snippet.id}
                snippet={snippet}
                folders={foldersMap}
                onTagClick={setSelectedTag}
                formatRelativeTime={formatRelativeTime}
                onDelete={handleDeleteSnippet}
              />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mb-3 sm:mb-4">
              <FileCode className="h-6 w-6 sm:h-8 w-6 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              {searchQuery || selectedTag ? 'No snippets found' : 'No snippets yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
              {searchQuery || selectedTag ? (
                <>
                  No snippets match your search. Continue typing to create a new snippet with this text, or{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue('')
                      setInputMode('search')
                      setHadNoResults(false)
                    }}
                    className="text-primary hover:underline"
                  >
                    clear search
                  </button>
                  .
                </>
              ) : (
                'Type in the box above to create your first snippet'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Folder Dialog */}
      <FolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        mode="create"
        parent_id={folderDialogParentId}
        onSuccess={() => {
          loadSnippets()
        }}
      />
    </div>
  )
}
