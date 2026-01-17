import { z } from 'zod'
import { useState } from 'react'
import { folderCreate } from '~/server/folders'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { toast } from 'sonner'

const folderFormSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100, 'Folder name must be less than 100 characters'),
  color: z.string().default('gray'),
})

const AVAILABLE_COLORS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
]

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = folderFormSchema.safeParse({ name, color })
    if (!result.success) {
      toast.error(result.error.errors[0].message)
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
        // TODO: Implement folder update
        toast.info('Folder editing coming soon')
        return
      }

      onSuccess?.()
      onOpenChange(false)
      setName('')
      setColor('gray')
    } catch {
      toast.error('Failed to save folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              <Input
                id="folder-name"
                placeholder="My Folder"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-9 gap-2">
                {AVAILABLE_COLORS.map(colorOption => (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`h-8 w-8 rounded-full ${colorOption.class} ${
                      color === colorOption.value ? 'ring-2 ring-ring ring-offset-2' : ''
                    } hover:opacity-80 transition-opacity`}
                    title={colorOption.label}
                  />
                ))}
              </div>
            </div>
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
      </DialogContent>
    </Dialog>
  )
}
