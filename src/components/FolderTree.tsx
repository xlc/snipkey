import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import type { FolderTreeItem } from '~/lib/server/folders'

interface FolderTreeProps {
  tree: FolderTreeItem[]
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: (parentId: string | null) => void
  onEditFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  level?: number
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
}: FolderTreeProps) {
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
  const isSelected = selectedFolderId === item.id
  const indent = level * 16

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-accent cursor-pointer transition-colors touch-manipulation"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => onFolderSelect(item.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className={`w-3 h-3 rounded-full ${COLORS[item.color] || 'bg-gray-500'} flex-shrink-0`} />

        <span className="flex-1 text-sm truncate">{item.name}</span>

        <Badge variant="secondary" className="text-xs">
          {item.snippet_count}
        </Badge>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={e => {
              e.stopPropagation()
              onCreateFolder(item.id)
            }}
          >
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
