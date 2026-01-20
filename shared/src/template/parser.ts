import type { ParseError, ParseResult, PlaceholderSegment, Segment } from './types'

// Regex to match {{placeholder}} syntax
// Matches: {{name}} or {{name=default}} or {{name:number}} or {{name:enum(opt1,opt2)=default}}
const PLACEHOLDER_REGEX = /\{\{(\w+)(?::(number|enum\(([^)]+)\)))?(?:=([^}]*))?\}\}/g

export function parseTemplate(body: string): ParseResult {
  const segments: Segment[] = []
  const placeholders: PlaceholderSegment[] = []
  const errors: ParseError[] = []
  const seenNames = new Set<string>()
  let lastIndex = 0

  // Reset regex state for new string
  PLACEHOLDER_REGEX.lastIndex = 0
  let match: RegExpExecArray | null = PLACEHOLDER_REGEX.exec(body)
  while (match !== null) {
    const [fullMatch, name, typePart, enumOptions, defaultValue] = match
    const start = match.index
    const end = start + fullMatch.length

    // Add text before this placeholder
    if (start > lastIndex) {
      segments.push({
        kind: 'text',
        value: body.slice(lastIndex, start),
      })
    }

    // Parse the type - defaults to 'text' if not specified
    let phType: 'text' | 'number' | 'enum' = 'text'
    let options: string[] | undefined

    if (typePart?.startsWith('enum(')) {
      if (!enumOptions) {
        errors.push({
          message: `Enum placeholder "${name}" must have options, e.g., {{name:enum(opt1,opt2)}}`,
          start,
          end,
        })
        phType = 'text'
      } else {
        phType = 'enum'
        options = enumOptions.split(',').map(s => s.trim())
        if (options.length === 0) {
          errors.push({
            message: `Enum placeholder "${name}" must have at least one option`,
            start,
            end,
          })
        }
      }
    } else if (typePart === 'number') {
      phType = 'number'
    }

    // Create placeholder segment
    const placeholder: PlaceholderSegment = {
      kind: 'ph',
      name: name ?? '',
      phType,
      options,
      defaultValue: defaultValue && defaultValue.length > 0 ? defaultValue : undefined,
      raw: fullMatch,
      start,
      end,
    }

    segments.push(placeholder)

    // Track unique placeholders (first appearance wins)
    if (placeholder.name && !seenNames.has(placeholder.name)) {
      seenNames.add(placeholder.name)
      placeholders.push(placeholder)
    }

    lastIndex = end
    match = PLACEHOLDER_REGEX.exec(body)
  }

  // Add remaining text
  if (lastIndex < body.length) {
    segments.push({
      kind: 'text',
      value: body.slice(lastIndex),
    })
  }

  return { segments, placeholders, errors }
}
