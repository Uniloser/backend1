const { z } = require('zod') as { z: any };

export const createPromotionSchema = z.object({
	story_id: z.string().uuid(),
	promotion_type: z.enum(['boost', 'featured', 'reward']).default('boost'),
	budget: z.coerce.number().int().min(20).max(100000),
	duration_days: z.coerce.number().int().min(1).max(30),
});

export type CreatePromotionInput = {
	story_id: string;
	promotion_type: 'boost' | 'featured' | 'reward';
	budget: number;
	duration_days: number;
};