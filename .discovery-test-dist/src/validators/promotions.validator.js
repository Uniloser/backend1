"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromotionSchema = void 0;
const { z } = require('zod');
exports.createPromotionSchema = z.object({
    story_id: z.string().uuid(),
    promotion_type: z.enum(['boost', 'featured', 'reward']).default('boost'),
    budget: z.coerce.number().int().min(20).max(100000),
    duration_days: z.coerce.number().int().min(1).max(30),
});
