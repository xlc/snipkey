import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Collapsible, CollapsibleContent } from '~/components/ui/collapsible'
import type { FolderTreeItem } from '~/lib/server/folders'

interface FolderTreeProps {
  tree: FolderTreeItem[]
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: (parentId: string | null) => void
  onEditFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  level?: number
  loading?: boolean
}

const COLORS: Record<string, string> = {
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
}

export function FolderTree({
  tree,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  level = 0,
  loading = false,
}: FolderTreeProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2 py-1.5 px-2 animate-pulse">
            <div className="w-5 h-5 bg-muted rounded" />
            <div className="flex-1 h-4 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No folders yet. Create your first folder to organize your snippets!
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tree.map(item => (
        <FolderTreeNode
          key={item.id}
          item={item}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          level={level}
        />
      ))}
    </div>
  )
}

interface FolderTreeNodeProps {
  item: FolderTreeItem
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: (parentId: string | null) => void
  onEditFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  level: number
}

function FolderTreeNode({
  item,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  level,
}: FolderTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = item.children.length > 0
  const _isSelected = selectedFolderId === item.id
  const indent = level * 16

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleSelect = useCallback(() => {
    onFolderSelect(item.id)
  }, [item.id, onFolderSelect])

  const handleCreate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onCreateFolder(item.id)
    },
    [item.id, onCreateFolder],
  )

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent cursor-pointer transition-colors touch-manipulation"
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              handleToggle()
            }}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
            aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <button
          type="button"
          className="flex items-center gap-1 flex-1 min-w-0 text-left"
          onClick={handleSelect}
          aria-label={`Select folder: ${item.name}`}
        >
          <div className={`w-3 h-3 rounded-full ${COLORS[item.color] || 'bg-gray-500'} flex-shrink-0`} />

          <span className="flex-1 text-sm truncate">{item.name}</span>

          <Badge variant="secondary" className="text-xs">
            {item.snippet_count}
          </Badge>
        </button>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreate}>
            <span className="text-xs">+</span>
          </Button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-1">
            {item.children.map(child => (
              <FolderTreeNode
                key={child.id}
                item={child}
                selectedFolderId={selectedFolderId}
                onFolderSelect={onFolderSelect}
                onCreateFolder={onCreateFolder}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                level={level + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
