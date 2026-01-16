import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Clock, Download, FileCode, Filter, Plus, Search, Tags, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
import { createSnippet, getAuthStatus, listSnippets, syncToServer } from '~/lib/snippet-api'
import { tagsList } from '~/server/tags'

export const Route = createFileRoute('/')({
  component: Index,
})

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
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [allTags, setAllTags] = useState<string[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  const [syncing, setSyncing] = useState(false)

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

  async function loadSnippets() {
    setLoading(true)
    const result = await listSnippets({
      limit: 20,
      query: debouncedSearchQuery || undefined,
      tag: selectedTag || undefined,
      sortBy,
      sortOrder,
    })

    if (result.error) {
      toast.error('Failed to load snippets')
      setLoading(false)
      return
    }

    const items = result.data || []

    // Load tags from server for accurate counts (only if authenticated)
    if (authenticated) {
      const tagsResult = await tagsList({})
      if (!tagsResult.error && tagsResult.data) {
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
        // Fallback: extract tags from fetched snippets
        const tags = new Set<string>()
        for (const item of items) {
          for (const tag of item.tags) {
            tags.add(tag)
          }
        }
        setAllTags(Array.from(tags).sort())
      }
    } else {
      // Local mode: extract tags from fetched snippets
      const tags = new Set<string>()
      for (const item of items) {
        for (const tag of item.tags) {
          tags.add(tag)
        }
      }
      setAllTags(Array.from(tags).sort())
    }

    setSnippets(items)
    // Add a small delay for smoother transitions
    setTimeout(() => setLoading(false), 100)
  }

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
    <div className="space-y-8">
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
          {authenticated ? (
            <Button variant="outline" onClick={handleSync} disabled={syncing || unsyncedCount === 0}>
              {syncing ? 'Syncing...' : `Sync${unsyncedCount > 0 ? ` (${unsyncedCount})` : ''}`}
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/login">Sign Up (It's Free)</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href="/tags">
              <Tags className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Manage Tags</span>
            </a>
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
              placeholder="Search snippets... (title, content, tags) (/ to focus)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
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
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('updated')}>
                {sortBy === 'updated' && '✓ '}
                Last Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('title')}>
                {sortBy === 'title' && '✓ '}
                Title
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                {sortOrder === 'desc' ? '↑ ' : '↓ '}
                {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
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
                {searchQuery.length > 20 && '...'}
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
        // Loading skeleton
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
      ) : snippets && snippets.length > 0 ? (
        // Snippet grid
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {snippets.map(snippet => (
            <div
              key={snippet.id}
              className="relative p-4 border rounded-lg hover:shadow-md hover:border-primary/50 transition-all duration-200 bg-card h-full flex flex-col group animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Link overlay for card navigation */}
              <Link to="/snippets/$id" params={{ id: snippet.id }} className="absolute inset-0 z-0" aria-label={`View ${snippet.title}`} />

              {/* Sync status badge */}
              {authenticated && <SyncStatusBadge snippet={snippet} />}

              {/* Title */}
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors pr-12 line-clamp-2 relative z-10">
                {snippet.title}
              </h3>

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground relative z-10">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(snippet.updated_at)}</span>
              </div>

              {/* Preview */}
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1 relative z-10">
                {snippet.body.slice(0, 150)}
                {snippet.body.length > 150 && '...'}
              </p>

              {/* Tags */}
              {snippet.tags.length > 0 && (
                <div className="flex gap-3 mt-4 flex-wrap relative z-10">
                  {snippet.tags.slice(0, 3).map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      interactive
                      onClick={() => {
                        setSelectedTag(tag)
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

              {/* Hover indicator */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <FileCode className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
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
  )
}
