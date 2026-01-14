export type PlaceholderType = "text" | "number" | "enum";

export interface TextSegment {
	kind: "text";
	value: string;
}

export interface PlaceholderSegment {
	kind: "ph";
	name: string;
	phType: PlaceholderType;
	options?: string[];
	defaultValue?: string;
	raw: string;
	start: number;
	end: number;
}

export type Segment = TextSegment | PlaceholderSegment;

export interface ParseError {
	message: string;
	start: number;
	end: number;
}

export interface ParseResult {
	segments: Segment[];
	placeholders: PlaceholderSegment[];
	errors: ParseError[];
}

export interface RenderError {
	placeholder: string;
	message: string;
}

export interface RenderResult {
	rendered: string;
	errors?: RenderError[];
}
