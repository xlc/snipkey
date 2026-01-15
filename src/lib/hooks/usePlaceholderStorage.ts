import { useEffect, useState } from 'react'

const STORAGE_PREFIX = 'snippet_values_'

export function usePlaceholderStorage(
	snippetId: string,
	initialValues: Record<string, string> = {},
) {
	const [values, setValues] = useState<Record<string, string>>(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(`${STORAGE_PREFIX}${snippetId}`)
			if (stored) {
				try {
					return JSON.parse(stored)
				} catch {
					return initialValues
				}
			}
		}
		return initialValues
	})

	// Save to localStorage whenever values change
	useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(`${STORAGE_PREFIX}${snippetId}`, JSON.stringify(values))
		}
	}, [snippetId, values])

	return [values, setValues] as const
}
