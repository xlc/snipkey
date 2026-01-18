import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui/dialog'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  {
    key: 'Ctrl + N',
    description: 'Create new snippet',
    category: 'Navigation',
  },
  {
    key: '/',
    description: 'Focus search bar',
    category: 'Navigation',
  },
  {
    key: 'Ctrl + E',
    description: 'Export snippets',
    category: 'Actions',
  },
  {
    key: 'Esc',
    description: 'Clear filters',
    category: 'Navigation',
  },
  {
    key: 'Tab',
    description: 'Navigate through UI',
    category: 'Navigation',
  },
  {
    key: 'Shift + Tab',
    description: 'Navigate backwards',
    category: 'Navigation',
  },
]

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Power through your workflow with these keyboard shortcuts</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {categories.map(category => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h4>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map(shortcut => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-background border rounded-md">
                        {shortcut.key}
                      </kbd>
                      <span className="text-sm">{shortcut.description}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-background border rounded">Esc</kbd> or click outside to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
