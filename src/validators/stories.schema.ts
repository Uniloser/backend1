const { z } = require('zod') as {
	z: any;
};

const storyFields = {
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(5_000).nullable().optional(),
	genre: z.string().trim().min(1).max(80),
	tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
	cover_url: z.string().url().nullable().optional(),
};

export const createStorySchema = z.object(storyFields);

export const updateStorySchema = z.object({
	...storyFields,
	status: z.enum(['draft', 'published']).optional(),
}).partial();

export type CreateStoryInput = {
	title: string;
	description?: string | null;
	genre: string;
	tags?: string[];
	cover_url?: string | null;
};

export type UpdateStoryInput = Partial<CreateStoryInput> & {
	status?: 'draft' | 'published';
};

export const discoveryQuerySchema = z.object({
	genre: z.string().trim().max(80).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export const searchQuerySchema = z.object({
	q: z.string().trim().min(1).max(100),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});
// Story Zod schema stub.
// TODO: validate title, description, genre, tags, and allowed status transitions;
// keep author_id and other server-owned fields out of client input.
