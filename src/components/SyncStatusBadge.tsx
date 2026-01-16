import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import type { SnippetListItem } from '~/lib/snippet-api'

interface SyncStatusBadgeProps {
  snippet: SnippetListItem
}

export function SyncStatusBadge({ snippet }: SyncStatusBadgeProps) {
  if (snippet.synced === false) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/20">
        <CloudOff className="h-3 w-3" />
        Unsynced
      </span>
    )
  }

  if (snippet.synced === true) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-500/20">
        <Cloud className="h-3 w-3" />
        Synced
      </span>
    )
  }

  // Local mode - no sync status
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-muted/50 text-muted-foreground rounded-full">
      <CloudOff className="h-3 w-3" />
      Local
    </span>
  )
}

interface SyncButtonProps {
  syncing: boolean
  onSync: () => void
  unsyncedCount?: number
}

export function SyncButton({ syncing, onSync, unsyncedCount = 0 }: SyncButtonProps) {
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent hover:text-accent-foreground active:scale-95"
      title={unsyncedCount > 0 ? `${unsyncedCount} snippets to sync` : 'Sync snippets'}
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
      {unsyncedCount > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
          {unsyncedCount}
        </span>
      )}
    </button>
  )
}
