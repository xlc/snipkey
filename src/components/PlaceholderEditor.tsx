import type { PlaceholderSegment } from '@shared/template'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

interface PlaceholderEditorProps {
  placeholders: PlaceholderSegment[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function PlaceholderEditor({ placeholders, values, onChange }: PlaceholderEditorProps) {
  return (
    <div className="space-y-3">
      {placeholders.map(placeholder => {
        const currentValue = values[placeholder.name] ?? placeholder.defaultValue ?? ''

        return (
          <div key={placeholder.name} className="flex items-start gap-2">
            <span className="text-sm font-medium shrink-0 mt-2">{placeholder.name}</span>
            <div className="flex-1">
              {placeholder.phType === 'text' && (
                <Textarea
                  placeholder={placeholder.defaultValue ?? ''}
                  value={currentValue}
                  onChange={e => onChange({ ...values, [placeholder.name]: e.target.value })}
                  rows={2}
                  className="font-mono text-sm"
                />
              )}
              {placeholder.phType === 'number' && (
                <Input
                  type="number"
                  placeholder={placeholder.defaultValue ?? ''}
                  value={currentValue}
                  onChange={e => onChange({ ...values, [placeholder.name]: e.target.value })}
                  className="font-mono text-sm"
                />
              )}
              {placeholder.phType === 'enum' && (
                <div className="flex gap-1.5 flex-wrap">
                  {placeholder.options?.map(option => (
                    <Badge
                      key={option}
                      variant={currentValue === option ? 'default' : 'outline'}
                      className="cursor-pointer"
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
