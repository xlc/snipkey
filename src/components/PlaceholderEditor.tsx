import type { PlaceholderSegment } from '@shared/template'
import { memo } from 'react'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

interface PlaceholderEditorProps {
  placeholders: PlaceholderSegment[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

function PlaceholderEditorComponent({ placeholders, values, onChange }: PlaceholderEditorProps) {
  return (
    <div className="space-y-3">
      {placeholders.map(placeholder => {
        const currentValue = values[placeholder.name] ?? placeholder.defaultValue ?? ''

        return (
          <div key={placeholder.name} className="flex items-start gap-2 sm:gap-3">
            <span className="text-sm sm:text-sm font-medium shrink-0 mt-2">{placeholder.name}</span>
            <div className="flex-1">
              {placeholder.phType === 'text' && (
                <Textarea
                  inputMode="text"
                  placeholder={placeholder.defaultValue ?? ''}
                  value={currentValue}
                  onChange={e => onChange({ ...values, [placeholder.name]: e.target.value })}
                  rows={2}
                  className="font-mono text-sm min-h-[80px]"
                />
              )}
              {placeholder.phType === 'number' && (
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={placeholder.defaultValue ?? ''}
                  value={currentValue}
                  onChange={e => onChange({ ...values, [placeholder.name]: e.target.value })}
                  className="font-mono text-sm h-11"
                />
              )}
              {placeholder.phType === 'enum' && (
                <div className="flex gap-2 flex-wrap">
                  {placeholder.options?.map(option => (
                    <Badge
                      key={option}
                      variant={currentValue === option ? 'default' : 'outline'}
                      className="cursor-pointer touch-manipulation h-11 sm:h-9 px-3"
                      onClick={() => onChange({ ...values, [placeholder.name]: option })}
                    >
                      {option}
                      {option === placeholder.defaultValue && ' (default)'}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Custom comparison function for props
function arePropsEqual(prev: PlaceholderEditorProps, next: PlaceholderEditorProps): boolean {
  // Compare placeholders array
  if (prev.placeholders !== next.placeholders) {
    if (prev.placeholders.length !== next.placeholders.length) return false

    for (let i = 0; i < prev.placeholders.length; i++) {
      const prevPh = prev.placeholders[i]
      const nextPh = next.placeholders[i]

      if (!prevPh || !nextPh) return false

      if (
        prevPh.name !== nextPh.name ||
        prevPh.phType !== nextPh.phType ||
        prevPh.defaultValue !== nextPh.defaultValue ||
        prevPh.options?.join(',') !== nextPh.options?.join(',')
      ) {
        return false
      }
    }
  }

  // Compare values object
  const prevKeys = Object.keys(prev.values)
  const nextKeys = Object.keys(next.values)

  if (prevKeys.length !== nextKeys.length) return false

  for (const key of prevKeys) {
    if (prev.values[key] !== next.values[key]) return false
  }

  // onChange function should be stable (ref equality)
  return prev.onChange === next.onChange
}

export const PlaceholderEditor = memo(PlaceholderEditorComponent, arePropsEqual)
