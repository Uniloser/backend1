const { z } = require('zod') as {
	z: any;
};

const contentType = z.enum(['text', 'comic']);

const chapterFields = {
	title: z.string().trim().min(1).max(200),
	content: z.string().max(500_000).optional(),
	content_type: contentType.optional(),
};

export const createChapterSchema = z.object({
	...chapterFields,
	status: z.enum(['draft', 'published']).default('draft'),
}).superRefine((
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

// Content update schema – status is optional with NO default so auto-saves
// that omit it will never accidentally overwrite the existing status.
export const updateChapterSchema = z.object({
	title: chapterFields.title.optional(),
	content: chapterFields.content,
	content_type: chapterFields.content_type,
	status: z.enum(['draft', 'published']).optional(),
}).superRefine((
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

// Dedicated status-only update schema used by PATCH /chapters/:id/status.
export const updateChapterStatusSchema = z.object({
	status: z.enum(['draft', 'published']),
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

export type UpdateChapterStatusInput = {
	status: 'draft' | 'published';
};

export type ReorderChaptersInput = {
	chapters: Array<{ id: string; chapter_order: number }>;
};
