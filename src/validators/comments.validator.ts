const { z } = require('zod') as {
	z: any;
};

export const createCommentSchema = z.object({
	text: z.string().trim().min(1).max(2_000),
});

export const commentsPaginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export type CreateCommentInput = { text: string };
// Comment Zod schema stub.
// TODO: validate comment text length and pagination parameters; exclude user_id
// because identity must come from req.user.id.
