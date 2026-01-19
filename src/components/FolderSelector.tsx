import { ChevronDown, Folder } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { COLORS } from '~/lib/constants/colors'
import type { FolderTreeItem } from '~/lib/server/folders'
import { getAuthStatus } from '~/lib/snippet-api'
import { foldersTree } from '~/server/folders'

interface FolderSelectorProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
}

function flattenFolders(tree: FolderTreeItem[], depth = 0): Array<FolderTreeItem & { depth: number }> {
  const result: Array<FolderTreeItem & { depth: number }> = []
  for (const folder of tree) {
    result.push({ ...folder, depth })
    if (folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, depth + 1))
    }
  }
  return result
}

export function FolderSelector({ selectedFolderId, onFolderSelect, onCreateFolder }: FolderSelectorProps) {
  const [folders, setFolders] = useState<Array<FolderTreeItem & { depth: number }>>([])
  const [loading, setLoading] = useState(false)

  // Load folders on mount
  useEffect(() => {
    async function loadFolders() {
      setLoading(true)
      try {
        const authStatus = await getAuthStatus()
        if (!authStatus.authenticated) {
          setFolders([])
          return
        }

        const result = await foldersTree({})
        if (result.error) {
          toast.error('Failed to load folders')
          setFolders([])
          return
        }

        const flat = flattenFolders(result.data.tree)
        setFolders(flat)
      } finally {
        setLoading(false)
      }
    }

    loadFolders()
  }, [])

  const selectedFolder = folders.find(f => f.id === selectedFolderId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start" disabled={loading}>
          {selectedFolder ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[selectedFolder.color] || COLORS.gray }} />
              <span className="flex-1 text-left truncate">{selectedFolder.name}</span>
              <span className="text-xs text-muted-foreground">({selectedFolder.snippet_count})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span className="flex-1 text-left">No folder</span>
            </div>
          )}
          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => onFolderSelect(null)}>
          <div className="flex items-center gap-2 w-full">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">No folder</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {folders.map(folder => (
          <DropdownMenuItem
            key={folder.id}
            onClick={() => onFolderSelect(folder.id)}
            className={selectedFolderId === folder.id ? 'bg-accent' : ''}
          >
            <div className="flex items-center gap-2 w-full" style={{ paddingLeft: `${folder.depth * 16}px` }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[folder.color] || COLORS.gray }} />
              <span className="flex-1 truncate">{folder.name}</span>
              <Badge variant="secondary" className="text-xs">
                {folder.snippet_count}
              </Badge>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateFolder}>
          <div className="flex items-center gap-2 text-primary">
            <span className="text-lg">+</span>
            <span>Create new folder</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
