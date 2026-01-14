import type { ParseError, ParseResult, PlaceholderSegment, Segment } from "./types";

// Regex to match {{placeholder}} syntax
const PLACEHOLDER_REGEX = /\{\{(\w+):(text|number|enum(?:\(([^)]+)\))?(?:=([^}]*))?)\}\}/g;

export function parseTemplate(body: string): ParseResult {
	const segments: Segment[] = [];
	const placeholders: PlaceholderSegment[] = [];
	const errors: ParseError[] = [];
	const seenNames = new Set<string>();
	let lastIndex = 0;

	// Reset regex state for new string
	PLACEHOLDER_REGEX.lastIndex = 0;
	let match: RegExpExecArray | null = PLACEHOLDER_REGEX.exec(body);
	while (match !== null) {
		const [fullMatch, name, typePart, enumOptions, defaultValue] = match;
		const start = match.index;
		const end = start + fullMatch.length;

		// Add text before this placeholder
		if (start > lastIndex) {
			segments.push({
				kind: "text",
				value: body.slice(lastIndex, start),
			});
		}

		// Parse the type
		let phType: "text" | "number" | "enum";
		let options: string[] | undefined;

		if (typePart === "enum") {
			if (!enumOptions) {
				errors.push({
					message: `Enum placeholder "${name}" must have options, e.g., {{name:enum(opt1,opt2)}}`,
					start,
					end,
				});
				phType = "text";
			} else {
				phType = "enum";
				options = enumOptions.split(",").map((s) => s.trim());
				if (options.length === 0) {
					errors.push({
						message: `Enum placeholder "${name}" must have at least one option`,
						start,
						end,
					});
				}
			}
		} else if (typePart === "number") {
			phType = "number";
		} else {
			phType = "text";
		}

		// Create placeholder segment
		const placeholder: PlaceholderSegment = {
			kind: "ph",
			name,
			phType,
			options,
			defaultValue: defaultValue ?? undefined,
			raw: fullMatch,
			start,
			end,
		};

		segments.push(placeholder);

		// Track unique placeholders (first appearance wins)
		if (!seenNames.has(name)) {
			seenNames.add(name);
			placeholders.push(placeholder);
		}

		lastIndex = end;
		match = PLACEHOLDER_REGEX.exec(body);
	}

	// Add remaining text
	if (lastIndex < body.length) {
		segments.push({
			kind: "text",
			value: body.slice(lastIndex),
		});
	}

	return { segments, placeholders, errors };
}
