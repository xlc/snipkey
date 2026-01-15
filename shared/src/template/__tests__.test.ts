import { describe, expect, test } from 'bun:test'
import { parseTemplate, renderTemplate } from '../index'

describe('template parser', () => {
	test('parses text placeholder', () => {
		const result = parseTemplate('Hello {{name:text=World}}!')
		expect(result.segments).toHaveLength(2)
		expect(result.placeholders).toHaveLength(1)
		expect(result.placeholders[0]?.name).toBe('name')
		expect(result.placeholders[0]?.phType).toBe('text')
		expect(result.placeholders[0]?.defaultValue).toBe('World')
		expect(result.errors).toHaveLength(0)
	})

	test('parses number placeholder', () => {
		const result = parseTemplate('Age: {{age:number=30}}')
		expect(result.segments).toHaveLength(2)
		expect(result.placeholders).toHaveLength(1)
		expect(result.placeholders[0]?.name).toBe('age')
		expect(result.placeholders[0]?.phType).toBe('number')
		expect(result.placeholders[0]?.defaultValue).toBe('30')
	})

	test('parses enum placeholder', () => {
		const result = parseTemplate('Tone: {{tone:enum(formal,casual)=casual}}')
		expect(result.segments).toHaveLength(2)
		expect(result.placeholders).toHaveLength(1)
		expect(result.placeholders[0]?.name).toBe('tone')
		expect(result.placeholders[0]?.phType).toBe('enum')
		expect(result.placeholders[0]?.options).toEqual(['formal', 'casual'])
		expect(result.placeholders[0]?.defaultValue).toBe('casual')
	})

	test('parses multiple placeholders', () => {
		const result = parseTemplate('Hello {{name:text=World}}, you are {{age:number=30}} years old.')
		expect(result.segments).toHaveLength(4)
		expect(result.placeholders).toHaveLength(2)
		expect(result.errors).toHaveLength(0)
	})

	test('handles placeholder without default', () => {
		const result = parseTemplate('Value: {{value:text}}')
		expect(result.placeholders[0]?.defaultValue).toBeUndefined()
	})

	test('handles empty template', () => {
		const result = parseTemplate('')
		expect(result.segments).toHaveLength(0)
		expect(result.placeholders).toHaveLength(0)
	})

	test('handles template with only text', () => {
		const result = parseTemplate('Just plain text')
		expect(result.segments).toHaveLength(1)
		expect(result.segments[0]?.kind).toBe('text')
		expect(result.placeholders).toHaveLength(0)
	})
})

describe('template renderer', () => {
	test('renders text with defaults', () => {
		const parsed = parseTemplate('Hello {{name:text=World}}!')
		const result = renderTemplate(parsed.segments, {})
		expect(result.rendered).toBe('Hello World!')
		expect(result.errors).toBeUndefined()
	})

	test('renders text with provided values', () => {
		const parsed = parseTemplate('Hello {{name:text=World}}!')
		const result = renderTemplate(parsed.segments, { name: 'Alice' })
		expect(result.rendered).toBe('Hello Alice!')
	})

	test('renders number with validation', () => {
		const parsed = parseTemplate('Age: {{age:number=30}}')
		const result = renderTemplate(parsed.segments, { age: '25' })
		expect(result.rendered).toBe('Age: 25')
		expect(result.errors).toBeUndefined()
	})

	test('reports error for invalid number', () => {
		const parsed = parseTemplate('Age: {{age:number=30}}')
		const result = renderTemplate(parsed.segments, { age: 'invalid' })
		expect(result.rendered).toBe('Age: invalid')
		expect(result.errors).toHaveLength(1)
		expect(result.errors?.[0]?.placeholder).toBe('age')
	})

	test('renders enum with valid value', () => {
		const parsed = parseTemplate('Tone: {{tone:enum(formal,casual)=casual}}')
		const result = renderTemplate(parsed.segments, { tone: 'formal' })
		expect(result.rendered).toBe('Tone: formal')
		expect(result.errors).toBeUndefined()
	})

	test('reports error for invalid enum value', () => {
		const parsed = parseTemplate('Tone: {{tone:enum(formal,casual)=casual}}')
		const result = renderTemplate(parsed.segments, { tone: 'slang' })
		expect(result.rendered).toBe('Tone: slang')
		expect(result.errors).toHaveLength(1)
		expect(result.errors?.[0]?.placeholder).toBe('tone')
	})

	test('renders complex template', () => {
		const parsed = parseTemplate(
			'Hello {{name:text=World}}, you are {{age:number=30}} with tone {{tone:enum(formal,casual)=casual}}.',
		)
		const result = renderTemplate(parsed.segments, {
			name: 'Alice',
			age: '25',
			tone: 'formal',
		})
		expect(result.rendered).toBe('Hello Alice, you are 25 with tone formal.')
		expect(result.errors).toBeUndefined()
	})
})
