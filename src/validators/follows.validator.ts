const { z } = require('zod') as {
	z: any;
};

export const userIdSchema = z.string().uuid();

export const paginationSchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});
// Follow Zod schema stub.
// TODO: validate target user ids and follower/following pagination inputs;
// enforce identity from req.user rather than request body.
