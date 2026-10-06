const { z } = require('zod') as {
	z: any;
};

export const createCommentSchema = z.object({
	text: z.string().trim().min(1).max(2_000),
	quote: z.string().trim().min(1).max(10_000).nullable().optional(),
	parent_comment_id: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
	text: z.string().trim().min(1).max(2_000),
	quote: z.string().trim().min(1).max(10_000).nullable().optional(),
});

export const commentIdSchema = z.string().uuid();

export const commentsPaginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type CreateCommentInput = {
	text: string;
	quote?: string | null;
	parent_comment_id?: string | null;
};

export type UpdateCommentInput = {
	text: string;
	quote?: string | null;
};
