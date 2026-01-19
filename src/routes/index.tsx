import { parseTemplate, renderTemplate } from '@shared/template'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileCode,
  Filter,
  Folder,
  FolderPlus,
  HelpCircle,
  Plus,
  Search,
  Tags,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FolderDialog } from '~/components/FolderDialog'
import { FolderTree } from '~/components/FolderTree'
import { KeyboardShortcutsHelp } from '~/components/KeyboardShortcutsHelp'
import { SyncStatusBadge } from '~/components/SyncStatusBadge'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { COLORS } from '~/lib/constants/colors'
import { useDebounce } from '~/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '~/lib/hooks/useKeyboardShortcuts'
import { useStorageListener } from '~/lib/hooks/useStorageListener'
import { getUnsyncedSnippets, listLocalSnippets } from '~/lib/local-storage'
import type { FolderTreeItem } from '~/lib/server/folders'
import {
  createSnippet,
  getAuthStatus,
  isValidSnippet,
  listSnippets,
  type PartialSnippet,
  syncToServer,
  type ValidatedSnippet,
} from '~/lib/snippet-api'
import { foldersTree } from '~/server/folders'
import { tagsList } from '~/server/tags'

export const Route = createFileRoute('/')({
  component: Index,
})

// Hoist loading skeleton outside component to prevent recreation on every render
const LOADING_SKELETON = (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="p-4 border rounded-lg animate-pulse">
        <div className="h-5 bg-muted rounded w-3/4 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-muted/50 rounded w-full" />
          <div className="h-3 bg-muted/50 rounded w-5/6" />
          <div className="h-3 bg-muted/50 rounded w-4/6" />
        </div>
        <div className="flex gap-2 mt-4">
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

// Memoized snippet card component to prevent unnecessary re-renders
interface SnippetCardProps {
  snippet: ValidatedSnippet
  folders: Map<string, { name: string; color: string }>
  authenticated: boolean
  onTagClick: (tag: string) => void
  formatRelativeTime: (timestamp: number) => string
  expandedCardId: string | null
  onExpandChange: (id: string | null) => void
}

const SnippetCard = memo(
  ({ snippet, folders, authenticated, onTagClick, formatRelativeTime, expandedCardId, onExpandChange }: SnippetCardProps) => {
    const isExpanded = expandedCardId === snippet.id
    const parseResult = useMemo(() => parseTemplate(snippet.body), [snippet.body])
    const hasPlaceholders = parseResult.placeholders.length > 0
    const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({})

    // Compute rendered output and errors
    const { rendered, renderErrors } = useMemo(() => {
      const renderResult = renderTemplate(parseResult.segments, placeholderValues)
      return {
        rendered: renderResult.rendered,
        renderErrors: !!renderResult.errors,
      }
    }, [parseResult.segments, placeholderValues])

    const handleCopy = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        try {
          await navigator.clipboard.writeText(rendered)
          toast.success('Copied to clipboard')
        } catch {
          toast.error('Failed to copy to clipboard')
        }
      },
      [rendered],
    )

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        // Don't expand if clicking on interactive elements (but allow clicking the card itself)
        const closestInteractive = (e.target as HTMLElement).closest('button, a, input, textarea, [role="button"]')
        if (closestInteractive && closestInteractive !== e.currentTarget) {
          return
        }
        onExpandChange(isExpanded ? null : snippet.id)
      },
      [isExpanded, snippet.id, onExpandChange],
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onExpandChange(isExpanded ? null : snippet.id)
        }
      },
      [isExpanded, snippet.id, onExpandChange],
    )

    const updatePlaceholderValue = useCallback((name: string, value: string) => {
      setPlaceholderValues(prev => ({ ...prev, [name]: value }))
    }, [])

    return (
      <div
        role="button"
        tabIndex={0}
        className={`relative border rounded-lg hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-card flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300 [content-visibility:auto] ${
          isExpanded ? 'p-6 col-span-full md:col-span-2 lg:col-span-3' : 'p-4 h-full'
        }`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
      >
        {/* Sync status badge */}
        {authenticated && <SyncStatusBadge snippet={snippet} />}

        {/* Folder badge */}
        {snippet.folder_id && folders.has(snippet.folder_id) && (
          <Badge
            variant="outline"
            className="absolute top-4 right-4 z-10"
            style={{ backgroundColor: `${COLORS[folders.get(snippet.folder_id)?.color ?? 'gray']}20` }}
          >
            <Folder className="h-3 w-3 mr-1" />
            {folders.get(snippet.folder_id)?.name}
          </Badge>
        )}

        {/* Header section - always visible */}
        <div className="relative z-10">
          {/* Expand/collapse button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onExpandChange(isExpanded ? null : snippet.id)
            }}
            className="absolute -top-2 -left-2 z-20 p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Body preview */}
          <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
            {isExpanded ? snippet.body : `${snippet.body.slice(0, 150)}${snippet.body.length > 150 ? '…' : ''}`}
          </p>

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(snippet.updated_at)}</span>
          </div>

          {/* Tags */}
          {snippet.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {snippet.tags.slice(0, 3).map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  interactive
                  onClick={e => {
                    e.stopPropagation()
                    onTagClick(tag)
                  }}
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

        {/* Expanded section */}
        {isExpanded && (
          <div className="mt-6 space-y-6 relative z-10">
            {/* Placeholders section */}
            {hasPlaceholders && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Fill in placeholders</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {parseResult.placeholders.map(ph => (
                    <div key={ph.name} className="space-y-2">
                      <label htmlFor={`placeholder-${snippet.id}-${ph.name}`} className="text-sm font-medium flex items-center gap-2">
                        {ph.name}
                        <Badge variant="outline" className="text-xs">
                          {ph.phType}
                        </Badge>
                        {ph.defaultValue !== undefined && (
                          <span className="text-xs text-muted-foreground">(default: "{ph.defaultValue}")</span>
                        )}
                      </label>
                      {ph.phType === 'text' && (
                        <Textarea
                          id={`placeholder-${snippet.id}-${ph.name}`}
                          placeholder={ph.defaultValue ?? ''}
                          value={placeholderValues[ph.name] ?? ''}
                          onChange={e => updatePlaceholderValue(ph.name, e.target.value)}
                          rows={2}
                        />
                      )}
                      {ph.phType === 'number' && (
                        <Input
                          id={`placeholder-${snippet.id}-${ph.name}`}
                          type="number"
                          placeholder={ph.defaultValue ?? ''}
                          value={placeholderValues[ph.name] ?? ''}
                          onChange={e => updatePlaceholderValue(ph.name, e.target.value)}
                        />
                      )}
                      {ph.phType === 'enum' && (
                        <div className="flex gap-2 flex-wrap">
                          {ph.options?.map(option => (
                            <Button
                              key={option}
                              type="button"
                              variant={(placeholderValues[ph.name] ?? ph.defaultValue) === option ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updatePlaceholderValue(ph.name, option)}
                            >
                              {option}
                              {option === ph.defaultValue && ' (default)'}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Rendered output</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} disabled={renderErrors}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/snippets/$id/edit" params={{ id: snippet.id }}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg border">
                <pre className="whitespace-pre-wrap font-mono text-sm break-words">{rendered}</pre>
              </div>
              {renderErrors && (
                <p className="text-sm text-destructive flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
                  Some placeholder values have errors.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Copy button (always visible when collapsed) */}
        {!isExpanded && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={handleCopy}
              aria-label="Copy rendered snippet"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  },
)
SnippetCard.displayName = 'SnippetCard'

function Index() {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [snippets, setSnippets] = useState<Array<PartialSnippet> | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'body'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [_allTags, setAllTags] = useState<string[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([])
  const [folderTreeLoading, setFolderTreeLoading] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderDialogParentId, setFolderDialogParentId] = useState<string | null>(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [quickCreateBody, setQuickCreateBody] = useState('')
  const [quickCreateLoading, setQuickCreateLoading] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  const [quickCreateTags, setQuickCreateTags] = useState<string[]>([])
  const [quickCreateTagInput, setQuickCreateTagInput] = useState('')
  const [quickCreateFolderId, setQuickCreateFolderId] = useState<string | null>(null)
  const [showQuickCreateOptions, setShowQuickCreateOptions] = useState(false)

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

    // Only fetch tags/folders if authenticated, otherwise resolve immediately
    const tagsPromise = authenticated ? tagsList({}) : Promise.resolve({ error: null, data: null })

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

    const [snippetsResult, tagsResult, foldersResult] = await Promise.all([snippetsPromise, tagsPromise, loadFolders()])

    if (snippetsResult.error) {
      setLoading(false)
      return
    }

    const items = snippetsResult.data || []

    // Process tags in parallel with snippets fetch
    if (authenticated && tagsResult?.data) {
      // Merge server tags with tags from local unsynced snippets
      const serverTags = new Set(tagsResult.data.tags.map(t => t.tag))

      // Add tags from local unsynced snippets
      const localUnsynced = getUnsyncedSnippets()
      for (const local of localUnsynced) {
        for (const tag of local.tags ?? []) {
          serverTags.add(tag)
        }
      }

      setAllTags(Array.from(serverTags).sort())
    } else {
      // Extract tags from all local snippets (not just paginated results)
      const localSnippets = listLocalSnippets()
      const tags = new Set<string>()
      for (const snippet of localSnippets) {
        for (const tag of snippet.tags ?? []) {
          tags.add(tag)
        }
      }
      setAllTags(Array.from(tags).sort())
    }

    // Load folder tree
    if (authenticated && foldersResult?.data) {
      setFolderTree(foldersResult.data.tree)
    } else {
      setFolderTree([])
    }

    setSnippets(items)
    // Add a small delay for smoother transitions
    setTimeout(() => setLoading(false), 100)
  }, [authenticated, debouncedSearchQuery, selectedFolderId, selectedTag, sortBy, sortOrder])

  // Listen for localStorage changes from other tabs to keep UI in sync
  useStorageListener('snipkey_meta', () => {
    // Reload snippets when metadata changes (e.g., authentication, sync status)
    loadSnippets()
  })

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

  const handleSync = useCallback(async () => {
    if (!authenticated) {
      toast.error('Please sign up to sync your snippets')
      return
    }

    setSyncing(true)
    try {
      const result = await syncToServer()
      const messages = []
      if (result.synced > 0) messages.push(`${result.synced} created`)
      if (result.updated > 0) messages.push(`${result.updated} updated`)
      if (result.deleted > 0) messages.push(`${result.deleted} deleted`)

      if (messages.length > 0) {
        await loadSnippets()
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} snippets failed to sync`)
      }
    } catch {
      toast.error('Failed to sync snippets')
    } finally {
      setSyncing(false)
    }
  }, [authenticated, loadSnippets])

  const handleQuickCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!quickCreateBody.trim()) return

      setQuickCreateLoading(true)
      try {
        const result = await createSnippet({
          body: quickCreateBody.trim(),
          tags: quickCreateTags,
          folder_id: quickCreateFolderId,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        // Reset form
        setQuickCreateBody('')
        setQuickCreateTags([])
        setQuickCreateTagInput('')
        setQuickCreateFolderId(null)
        setShowQuickCreateOptions(false)
        await loadSnippets()

        // Navigate to the new snippet
        if (result.data?.id) {
          router.navigate({ to: '/snippets/$id', params: { id: result.data.id } })
        }
      } finally {
        setQuickCreateLoading(false)
      }
    },
    [quickCreateBody, quickCreateTags, quickCreateFolderId, loadSnippets, router],
  )

  const handleAddQuickCreateTag = useCallback(
    (e?: React.KeyboardEvent) => {
      const tag = quickCreateTagInput.trim()
      if (!tag) return
      if (e && e.key !== 'Enter') return
      if (quickCreateTags.includes(tag)) {
        toast.error('Tag already exists')
        return
      }
      if (quickCreateTags.length >= 10) {
        toast.error('Maximum 10 tags allowed')
        return
      }
      setQuickCreateTags(prev => [...prev, tag])
      setQuickCreateTagInput('')
    },
    [quickCreateTagInput, quickCreateTags],
  )

  const handleRemoveQuickCreateTag = useCallback((tag: string) => {
    setQuickCreateTags(prev => prev.filter(t => t !== tag))
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrlKey: true,
      handler: () => router.navigate({ to: '/snippets/new' }),
      description: 'Create new snippet',
    },
    {
      key: '/',
      handler: () => {
        searchInputRef.current?.focus()
      },
      description: 'Focus search',
    },
    {
      key: 'Escape',
      handler: () => {
        if (searchQuery) {
          setSearchQuery('')
        } else if (selectedTag) {
          setSelectedTag(null)
        }
      },
      description: 'Clear filters',
    },
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-load when search, tag, sort, sortBy, sortOrder, or auth changes
  useEffect(() => {
    loadSnippets()
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder, authenticated])

  // Calculate unsynced count
  const unsyncedCount = snippets?.filter(s => s.synced === false).length || 0

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
      <div className="flex-1 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Snippets</h2>
            <p className="text-muted-foreground mt-2">Your private snippet vault with placeholders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {authenticated && unsyncedCount > 0 && (
              <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing…' : `Sync (${unsyncedCount})`}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowKeyboardShortcuts(true)} aria-label="Keyboard shortcuts">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Create Input */}
        <form onSubmit={handleQuickCreate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Edit area */}
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Type a snippet here and press Enter to save... (supports {{placeholder:text}} syntax)"
                  value={quickCreateBody}
                  onChange={e => setQuickCreateBody(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleQuickCreate(e)
                    }
                  }}
                  rows={6}
                  className="resize-none pr-12"
                  disabled={quickCreateLoading}
                />
                {quickCreateLoading && (
                  <div className="absolute right-3 top-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Options toggle */}
              <button
                type="button"
                onClick={() => setShowQuickCreateOptions(!showQuickCreateOptions)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showQuickCreateOptions ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                {showQuickCreateOptions ? 'Hide' : 'Show'} options
              </button>

              {/* Optional options */}
              {showQuickCreateOptions && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Tags className="h-4 w-4" />
                      Tags
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {quickCreateTags.map(tag => (
                        <Badge key={tag} variant="secondary" interactive onClick={() => handleRemoveQuickCreateTag(tag)}>
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={quickCreateTagInput}
                        onChange={e => setQuickCreateTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddQuickCreateTag(e)
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={() => handleAddQuickCreateTag()}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Folder */}
                  {authenticated && folderTree.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        Folder
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            {quickCreateFolderId ? (foldersMap.get(quickCreateFolderId)?.name ?? 'Select folder') : 'No folder'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem onClick={() => setQuickCreateFolderId(null)}>No folder</DropdownMenuItem>
                          {folderTree.map(folder => (
                            <DropdownMenuItem key={folder.id} onClick={() => setQuickCreateFolderId(folder.id)}>
                              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
                              {folder.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Live preview */}
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg border h-full min-h-[160px]">
                <pre className="whitespace-pre-wrap font-mono text-sm break-words">
                  {(() => {
                    const parseResult = parseTemplate(quickCreateBody)
                    const renderResult = renderTemplate(parseResult.segments, {})
                    return renderResult.rendered || quickCreateBody || 'Preview will appear here...'
                  })()}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">Live preview with default placeholder values.</p>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search snippets… (content, tags) (/ to focus)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSortBy('updated')}>
                  {sortBy === 'updated' && <span className="mr-2">✓</span>}
                  <span>Last Updated</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')}>
                  {sortBy === 'created' && <span className="mr-2">✓</span>}
                  <span>Date Created</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('body')}>
                  {sortBy === 'body' && <span className="mr-2">✓</span>}
                  <span>Content (A-Z)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                  <span className="mr-2">{sortOrder === 'desc' ? '↑ ' : '↓ '}</span>
                  <span>{sortOrder === 'desc' ? 'Ascending' : 'Descending'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {(selectedTag || searchQuery) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedTag && (
                <Badge variant="secondary" interactive onClick={() => setSelectedTag(null)}>
                  Tag: {selectedTag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" interactive onClick={() => setSearchQuery('')}>
                  Search: {searchQuery.slice(0, 20)}
                  {searchQuery.length > 20 && '…'}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {loading ? (
          LOADING_SKELETON
        ) : snippets && snippets.length > 0 ? (
          // Snippet grid
          // Filter to only render validated snippets (compile-time type safety)
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {snippets.filter(isValidSnippet).map(snippet => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                folders={foldersMap}
                authenticated={authenticated}
                onTagClick={setSelectedTag}
                formatRelativeTime={formatRelativeTime}
                expandedCardId={expandedCardId}
                onExpandChange={setExpandedCardId}
              />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <FileCode className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{searchQuery || selectedTag ? 'No snippets found' : 'No snippets yet'}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || selectedTag
                ? 'Try adjusting your search or filters to find what you are looking for.'
                : 'Create your first snippet to get started with your private snippet vault.'}
            </p>
            {!searchQuery && !selectedTag && (
              <Button asChild size="lg">
                <Link to="/snippets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Snippet
                </Link>
              </Button>
            )}
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
