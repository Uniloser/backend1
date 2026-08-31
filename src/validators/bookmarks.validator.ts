const { z } = require('zod') as { z: any };

export const createBookmarkSchema = z.object({
	story_id: z.string().uuid(),
	chapter_id: z.string().uuid().nullable().optional(),
	note: z.string().trim().max(2_000).nullable().optional(),
});

export const bookmarkIdSchema = z.string().uuid();
export const storyIdSchema = z.string().uuid();

export type CreateBookmarkInput = {
	story_id: string;
	chapter_id?: string | null;
	note?: string | null;
};
