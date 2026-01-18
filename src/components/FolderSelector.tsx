import { ChevronDown, Folder } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

interface FolderSelectorProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
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

export function FolderSelector({ selectedFolderId, onFolderSelect, onCreateFolder }: FolderSelectorProps) {
  const [folders, _setFolders] = useState<Array<{ id: string; name: string; color: string; snippet_count: number }>>([])

  // TODO: Load folders on mount
  // useEffect(() => { foldersTree().then(...) }, [])

  const selectedFolder = folders.find(f => f.id === selectedFolderId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start">
          {selectedFolder ? (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${COLORS[selectedFolder.color] || 'bg-gray-500'}`} />
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
            <div className="flex items-center gap-2 w-full">
              <div className={`w-3 h-3 rounded-full ${COLORS[folder.color] || 'bg-gray-500'}`} />
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
