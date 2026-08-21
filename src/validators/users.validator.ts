const { z } = require('zod') as {
	z: any;
};

export const usernameSchema = z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/i);

export const updateProfileSchema = z.object({
	bio: z.string().trim().max(500).nullable().optional(),
	display_name: z.string().trim().min(1).max(100).nullable().optional(),
	avatar_url: z.string().url().nullable().optional(),
});

export type UpdateProfileInput = {
	bio?: string | null;
	display_name?: string | null;
	avatar_url?: string | null;
};
// User Zod schema stub.
// TODO: validate username format and bio length limits for profile creation/
// lookup contracts, plus display_name and avatar_url update constraints.
// TODO: keep id, follower counts, and published stories server-owned.
