import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Clock, Download, FileCode, Filter, Folder, FolderPlus, HelpCircle, Plus, Search, Tags, Upload, X } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
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
import { useDebounce } from '~/lib/hooks/useDebounce'
import { useKeyboardShortcuts } from '~/lib/hooks/useKeyboardShortcuts'
import { useStorageListener } from '~/lib/hooks/useStorageListener'
import { getUnsyncedSnippets } from '~/lib/local-storage'
import type { FolderTreeItem } from '~/lib/server/folders'
import { createSnippet, getAuthStatus, listSnippets, syncToServer } from '~/lib/snippet-api'
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

// Color mapping for folder badges
const COLORS: Record<string, string> = {
  gray: '#6b7280',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
}

// Memoized snippet card component to prevent unnecessary re-renders
interface SnippetCardProps {
  snippet: {
    id: string
    title: string
    body: string
    tags: string[]
    updated_at: number
    synced?: boolean
    folder_id?: string | null
  }
  folders: Map<string, { name: string; color: string }>
  authenticated: boolean
  onTagClick: (tag: string) => void
  formatRelativeTime: (timestamp: number) => string
}

const SnippetCard = memo(({ snippet, folders, authenticated, onTagClick, formatRelativeTime }: SnippetCardProps) => (
  <div className="relative p-4 border rounded-lg hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-card h-full flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300 [content-visibility:auto]">
    {/* Link overlay for card navigation */}
    <Link to="/snippets/$id" params={{ id: snippet.id }} className="absolute inset-0 z-0" aria-label={`View ${snippet.title}`} />

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

    {/* Title */}
    <h3 className="font-semibold text-base group-hover:text-primary transition-colors pr-12 line-clamp-2 relative z-10">{snippet.title}</h3>

    {/* Timestamp */}
    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground relative z-10">
      <Clock className="h-3 w-3" />
      <span>{formatRelativeTime(snippet.updated_at)}</span>
    </div>

    {/* Preview */}
    <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1 relative z-10">
      {snippet.body.slice(0, 150)}
      {snippet.body.length > 150 && '…'}
    </p>

    {/* Tags */}
    {snippet.tags.length > 0 ? (
      <div className="flex gap-3 mt-4 flex-wrap relative z-10">
        {snippet.tags.slice(0, 3).map(tag => (
          <Badge key={tag} variant="secondary" interactive onClick={() => onTagClick(tag)}>
            {tag}
          </Badge>
        ))}
        {snippet.tags.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{snippet.tags.length - 3}
          </Badge>
        )}
      </div>
    ) : null}

    {/* Hover indicator */}
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <FileCode className="h-5 w-5 text-muted-foreground" />
    </div>
  </div>
))
SnippetCard.displayName = 'SnippetCard'

function Index() {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [snippets, setSnippets] = useState<Array<{
    id: string
    title: string
    body: string
    tags: string[]
    updated_at: number
    synced?: boolean
  }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [allTags, setAllTags] = useState<string[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([])
  const [folderTreeLoading, setFolderTreeLoading] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderDialogParentId, setFolderDialogParentId] = useState<string | null>(null)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Debounce search input to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Listen for localStorage changes from other tabs to keep UI in sync
  useStorageListener('snipkey_meta', () => {
    // Reload snippets when metadata changes (e.g., authentication, sync status)
    loadSnippets()
  })

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
        const result = await foldersTree()
        setFolderTreeLoading(false)
        return { error: null, data: result.data }
      } catch {
        setFolderTreeLoading(false)
        return { error: null, data: null }
      }
    }

    const [snippetsResult, tagsResult, foldersResult] = await Promise.all([snippetsPromise, tagsPromise, loadFolders()])

    if (snippetsResult.error) {
      toast.error('Failed to load snippets')
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
        for (const tag of local.tags) {
          serverTags.add(tag)
        }
      }

      setAllTags(Array.from(serverTags).sort())
    } else {
      // Extract tags from fetched snippets (both authenticated fallback and local mode)
      const tags = new Set<string>()
      for (const item of items) {
        for (const tag of item.tags) {
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

  // Reload snippets when filters change
  useEffect(() => {
    loadSnippets()
  }, [loadSnippets])

  async function handleSync() {
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
        toast.success(`Sync: ${messages.join(', ')}`)
        await loadSnippets()
      } else {
        toast.info('Everything is already synced')
      }
      if (result.skipped > 0) {
        toast.info(`${result.skipped} snippets skipped (modified during sync)`)
      }
      if (result.errors > 0) {
        toast.error(`${result.errors} snippets failed to sync`)
      }
    } catch {
      toast.error('Failed to sync snippets')
    } finally {
      setSyncing(false)
    }
  }

  async function handleExport() {
    // Export all snippets
    const result = await listSnippets({ limit: 1000 })

    if (result.error) {
      toast.error('Failed to export snippets')
      return
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      snippets: result.data || [],
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snipkey-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    const itemCount = result.data?.length || 0
    toast.success(`Exported ${itemCount} snippets`)
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.snippets || !Array.isArray(importData.snippets)) {
        throw new Error('Invalid import file format')
      }

      let imported = 0
      let skipped = 0

      for (const snippet of importData.snippets) {
        const result = await createSnippet({
          title: snippet.title,
          body: snippet.body,
          tags: snippet.tags,
        })

        if (result.error) {
          skipped++
        } else {
          imported++
        }
      }

      toast.success(`Imported ${imported} snippets${skipped > 0 ? ` (${skipped} skipped)` : ''}`)

      // Reload snippets
      loadSnippets()
    } catch (error) {
      toast.error(`Failed to import snippets: ${(error as Error).message}`)
    }

    // Reset file input
    event.target.value = ''
  }

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
    {
      key: 'e',
      ctrlKey: true,
      handler: handleExport,
      description: 'Export snippets',
    },
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-load when search, tag, sort, sortBy, sortOrder, or auth changes
  useEffect(() => {
    loadSnippets()
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder, authenticated])

  // Format timestamp to relative time
  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

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
            <p className="text-muted-foreground mt-2">
              Your private snippet vault with placeholders
              {!authenticated && ' • Works Offline'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowKeyboardShortcuts(true)} aria-label="Keyboard shortcuts">
              <HelpCircle className="h-4 w-4" />
            </Button>
            {authenticated ? (
              <Button variant="outline" onClick={handleSync} disabled={syncing || unsyncedCount === 0}>
                {syncing ? 'Syncing…' : `Sync${unsyncedCount > 0 ? ` (${unsyncedCount})` : ''}`}
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">Sign Up (It's Free)</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/tags">
                <Tags className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manage Tags</span>
              </Link>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" asChild className="relative">
              <label htmlFor="import-input" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Import</span>
                <input id="import-input" type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </Button>
            <Button asChild>
              <Link to="/snippets/new">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Snippet</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search snippets… (title, content, tags) (/ to focus)"
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
                <DropdownMenuItem onClick={() => setSortBy('title')}>
                  {sortBy === 'title' && <span className="mr-2">✓</span>}
                  <span>Title (A-Z)</span>
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
              {(selectedTag || searchQuery) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  aria-label="Clear all filters"
                  onClick={() => {
                    setSelectedTag(null)
                    setSearchQuery('')
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>
          )}

          {allTags.length > 0 && !selectedTag && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Popular tags:</p>
              <div className="flex gap-2 flex-wrap">
                {allTags.slice(0, 10).map(tag => (
                  <Badge key={tag} variant="outline" interactive className="hover:bg-accent" onClick={() => setSelectedTag(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          LOADING_SKELETON
        ) : snippets && snippets.length > 0 ? (
          // Snippet grid
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {snippets.map(snippet => {
              // Build a flat map of folders for easy lookup
              const foldersMap = new Map<string, { name: string; color: string }>()
              const addToMap = (items: FolderTreeItem[]) => {
                for (const item of items) {
                  foldersMap.set(item.id, { name: item.name, color: item.color })
                  if (item.children.length > 0) addToMap(item.children)
                }
              }
              addToMap(folderTree)

              return (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  folders={foldersMap}
                  authenticated={authenticated}
                  onTagClick={setSelectedTag}
                  formatRelativeTime={formatRelativeTime}
                />
              )
            })}
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
