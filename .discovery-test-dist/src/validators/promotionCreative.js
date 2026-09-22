"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promotionCreativeSchema = void 0;
const zod_1 = require("zod");
exports.promotionCreativeSchema = zod_1.z.object({
    layout: zod_1.z.enum(['auto', 'cinematic', 'character-focus', 'minimal', 'scrapbook', 'mood', 'series']).optional(),
    headline: zod_1.z.string().max(90).optional(), tagline: zod_1.z.string().max(150).optional(),
    promoImage: zod_1.z.string().url().regex(/^https?:\/\//).max(2048).optional(),
    backgroundImage: zod_1.z.string().url().regex(/^https?:\/\//).max(2048).optional(),
    accentColor: zod_1.z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    secondaryColor: zod_1.z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    badgeText: zod_1.z.enum(['Sponsored Story', 'Sponsored Pick', 'Promoted Story']).optional(),
    ctaText: zod_1.z.enum(['Read Story', 'Start Reading', 'Continue Series', 'Read New Chapter']).optional(),
    mood: zod_1.z.enum(['romance', 'fantasy', 'horror', 'comedy', 'drama', 'mystery', 'action', 'sci-fi']).optional(),
    fontStyle: zod_1.z.enum(['sans', 'serif', 'handwritten']).optional(),
    showGenres: zod_1.z.boolean().optional(), showSave: zod_1.z.boolean().optional(), seriesLabel: zod_1.z.string().max(65).optional(),
});
