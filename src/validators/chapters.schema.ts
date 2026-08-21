const { z } = require('zod') as {
	z: any;
};

export const createChapterSchema = z.object({
	title: z.string().trim().min(1).max(200),
	content: z.string().min(1).max(500_000),
	status: z.enum(['draft', 'published']).default('draft'),
});

export const updateChapterSchema = createChapterSchema.partial();

export const reorderChaptersSchema = z.object({
	chapters: z.array(z.object({
		id: z.string().uuid(),
		chapter_order: z.number().int().positive(),
	})).min(1),
});

export type CreateChapterInput = {
	title: string;
	content: string;
	status?: 'draft' | 'published';
};

export type UpdateChapterInput = Partial<CreateChapterInput>;

export type ReorderChaptersInput = {
	chapters: Array<{ id: string; chapter_order: number }>;
};
// Chapter Zod schema stub.
// TODO: validate title/content, publication status, and reorder payloads;
// reject client-controlled story_id, chapter_order, and published_at fields.
