import { z } from "zod";

export const snippetSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(200, "Title must be less than 200 characters")
		.transform((val) => val.trim()),
	body: z.string().max(50000, "Body must be less than 50000 characters"),
	tags: z
		.array(z.string())
		.transform((tags) =>
			tags
				.map((tag) => tag.trim().toLowerCase())
				.filter((tag) => tag.length > 0)
				.filter((tag, i, arr) => arr.indexOf(tag) === i),
		)
		.refine((tags) => tags.length <= 10, "Maximum 10 tags allowed"),
});

export const snippetCreateInput = snippetSchema;

export const snippetUpdateInput = snippetSchema
	.partial()
	.required({ id: true })
	.extend({
		id: z.string().uuid("Invalid snippet ID"),
	});

export const snippetListInput = z.object({
	query: z.string().max(200).optional(),
	tag: z.string().max(50).optional(),
	limit: z.number().int().positive().max(100).default(20),
	cursor: z
		.object({
			updatedAt: z.number(),
			id: z.string(),
		})
		.optional(),
});

export const authRegisterStartInput = z.object({});

export const authRegisterFinishInput = z.object({
	attestation: z.any(),
	challengeId: z.string().uuid("Invalid challenge ID"),
});

export const authLoginStartInput = z.object({});

export const authLoginFinishInput = z.object({
	assertion: z.any(),
	challengeId: z.string().uuid("Invalid challenge ID"),
});

export type SnippetCreateInput = z.infer<typeof snippetCreateInput>;
export type SnippetUpdateInput = z.infer<typeof snippetUpdateInput>;
export type SnippetListInput = z.infer<typeof snippetListInput>;
export type AuthRegisterFinishInput = z.infer<typeof authRegisterFinishInput>;
export type AuthLoginFinishInput = z.infer<typeof authLoginFinishInput>;
