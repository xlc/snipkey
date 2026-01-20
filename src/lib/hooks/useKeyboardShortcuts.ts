import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  handler: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      // Check if user is typing in an input field
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Skip shortcuts if user is typing, but allow Escape and modifier key combinations
      if (isInputField && event.key !== 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        return
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const matchesCtrl = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey
        const matchesShift = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey
        const matchesAlt = shortcut.altKey === undefined || event.altKey === shortcut.altKey
        const matchesMeta = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          // Prevent default if the shortcut is handled
          if (shortcut.ctrlKey || shortcut.metaKey || shortcut.altKey || ['Escape', 'Enter'].includes(shortcut.key)) {
            event.preventDefault()
          }
          shortcut.handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
