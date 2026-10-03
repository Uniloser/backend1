const { z } = require('zod') as { z: any };

export const createPromotionSchema = z.object({
	story_id: z.string().uuid(),
	promotion_type: z.enum(['boost', 'featured', 'reward']).default('boost'),
	duration_days: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)]),
	request_key: z.string().uuid(),
});

export type CreatePromotionInput = {
	story_id: string;
	promotion_type: 'boost' | 'featured' | 'reward';
	duration_days: 1 | 3 | 7 | 14;
	request_key: string;
};