const { z } = require('zod') as { z: any };

export const storyIdSchema = z.string().uuid();

export const recordStoryViewSchema = z.object({
	chapter_id: z.string().uuid().nullable().optional(),
	session_id: z.string().trim().min(1).max(200).nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RecordStoryViewInput = {
	chapter_id?: string | null;
	session_id?: string | null;
	metadata?: Record<string, unknown>;
};
