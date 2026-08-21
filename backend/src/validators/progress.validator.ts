const { z } = require('zod') as {
	z: any;
};

export const progressSchema = z.object({
	last_chapter_id: z.string().uuid().nullable(),
});

export const storyIdSchema = z.string().uuid();

export type ProgressInput = {
	last_chapter_id: string | null;
};
// Reading-progress Zod schema stub.
// TODO: validate story id and last_chapter_id; verify relationship in the
// service before writing and never accept user_id from input.
