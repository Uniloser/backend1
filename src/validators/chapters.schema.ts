const { z } = require('zod') as {
	z: any;
};

const contentType = z.enum(['text', 'comic']);

const chapterBase = {
	title: z.string().trim().min(1).max(200),
	content: z.string().max(500_000).optional(),
	content_type: contentType.optional(),
	status: z.enum(['draft', 'published']).default('draft'),
};

export const createChapterSchema = z.object(chapterBase).superRefine((
	data: { content?: string; content_type?: 'text' | 'comic' },
	ctx: { addIssue: (issue: { code: string; message: string; path: string[] }) => void },
) => {
	const type = data.content_type ?? 'text';

	if (type === 'text' && (!data.content || data.content.trim().length === 0)) {
		ctx.addIssue({
			code: 'custom',
			message: 'Text chapters require content',
			path: ['content'],
		});
	}
});

export const updateChapterSchema = z.object({
	...chapterBase,
}).partial().superRefine((
	data: { content?: string; content_type?: 'text' | 'comic' },
	ctx: { addIssue: (issue: { code: string; message: string; path: string[] }) => void },
) => {
	if (data.content_type === 'text' && data.content !== undefined && data.content.trim().length === 0) {
		ctx.addIssue({
			code: 'custom',
			message: 'Text chapters require content',
			path: ['content'],
		});
	}
});

export const reorderChaptersSchema = z.object({
	chapters: z.array(z.object({
		id: z.string().uuid(),
		chapter_order: z.number().int().positive(),
	})).min(1),
});

export type CreateChapterInput = {
	title: string;
	content?: string;
	content_type?: 'text' | 'comic';
	status?: 'draft' | 'published';
};

export type UpdateChapterInput = Partial<CreateChapterInput>;

export type ReorderChaptersInput = {
	chapters: Array<{ id: string; chapter_order: number }>;
};
