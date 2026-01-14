import type { ParseResult, PlaceholderSegment, RenderError, RenderResult } from "./types";

export function renderTemplate(
	segments: ParseResult["segments"],
	valuesByName: Record<string, string | undefined>,
): RenderResult {
	const errors: RenderError[] = [];
	let rendered = "";

	for (const segment of segments) {
		if (segment.kind === "text") {
			rendered += segment.value;
		} else {
			const ph = segment as PlaceholderSegment;
			const value = valuesByName[ph.name] ?? ph.defaultValue ?? "";

			// Validate based on placeholder type
			if (ph.phType === "number") {
				if (value === "" && ph.defaultValue === undefined) {
					errors.push({
						placeholder: ph.name,
						message: `Number placeholder "${ph.name}" requires a value`,
					});
					rendered += value;
					continue;
				}
				if (value !== "" && Number.isNaN(Number(value))) {
					errors.push({
						placeholder: ph.name,
						message: `Invalid number value for "${ph.name}": "${value}"`,
					});
				}
			} else if (ph.phType === "enum") {
				if (value === "" && ph.defaultValue === undefined) {
					errors.push({
						placeholder: ph.name,
						message: `Enum placeholder "${ph.name}" requires a value`,
					});
					rendered += value;
					continue;
				}
				if (ph.options && value !== "" && !ph.options.includes(value)) {
					errors.push({
						placeholder: ph.name,
						message: `Invalid enum value for "${ph.name}": "${value}" must be one of ${ph.options.join(", ")}`,
					});
				}
			}

			rendered += value;
		}
	}

	return {
		rendered,
		errors: errors.length > 0 ? errors : undefined,
	};
}
