import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { COLORS } from '~/lib/constants/colors'
import { folderCreate, folderGet, folderUpdate } from '~/server/folders'

const folderFormSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name must be less than 100 characters'),
  color: z.string().default('gray'),
})

interface FolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  folderId?: string
  parent_id?: string | null
  onSuccess?: () => void
}

export function FolderDialog({ open, onOpenChange, mode, folderId, parent_id = null, onSuccess }: FolderDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('gray')
  const [loading, setLoading] = useState(false)
  const [loadingFolder, setLoadingFolder] = useState(false)

  // Load folder data when editing
  useEffect(() => {
    if (mode === 'edit' && folderId && open) {
      setLoadingFolder(true)
      folderGet({ data: { id: folderId } })
        .then(result => {
          if (result.error) {
            toast.error('Failed to load folder')
            onOpenChange(false)
            return
          }
          setName(result.data.folder.name)
          setColor(result.data.folder.color)
        })
        .finally(() => {
          setLoadingFolder(false)
        })
    } else if (mode === 'create' && open) {
      // Reset form when opening in create mode
      setName('')
      setColor('gray')
    }
  }, [mode, folderId, open, onOpenChange])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = folderFormSchema.safeParse({ name, color })
    if (!result.success) {
      toast.error(result.error.issues?.[0]?.message || 'Invalid input')
      return
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        const createResult = await folderCreate({ data: { name: result.data.name, color: result.data.color, parent_id } })
        if (createResult.error) {
          toast.error(createResult.error.message)
          return
        }
        toast.success('Folder created')
      } else if (mode === 'edit' && folderId) {
        const updateResult = await folderUpdate({ data: { id: folderId, data: { name: result.data.name, color: result.data.color } } })
        if (updateResult.error) {
          toast.error(updateResult.error.message)
          return
        }
        toast.success('Folder updated')
      }

      onSuccess?.()
      onOpenChange(false)
      if (mode === 'create') {
        setName('')
        setColor('gray')
      }
    } catch {
      toast.error('Failed to save folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {loadingFolder ? (
          <div className="py-8 text-center text-muted-foreground">Loading folder...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{mode === 'create' ? 'Create Folder' : 'Edit Folder'}</DialogTitle>
              <DialogDescription>
                {mode === 'create' ? 'Create a new folder to organize your snippets.' : 'Edit folder details.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="folder-name" className="text-sm font-medium">
                  Name
                </label>
                <Input id="folder-name" placeholder="My Folder" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Color</legend>
                <div className="grid grid-cols-9 gap-2">
                  {Object.keys(COLORS).map(colorValue => (
                    <button
                      key={colorValue}
                      type="button"
                      onClick={() => setColor(colorValue)}
                      className="h-8 w-8 rounded-full hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: COLORS[colorValue as keyof typeof COLORS],
                        boxShadow: color === colorValue ? '0 0 0 2px var(--ring), 0 0 0 4px var(--background)' : 'none',
                      }}
                      title={colorValue.charAt(0).toUpperCase() + colorValue.slice(1)}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
