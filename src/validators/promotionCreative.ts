import { z } from 'zod';

export const promotionCreativeSchema = z.object({
  layout: z.enum(['auto', 'cinematic', 'character-focus', 'minimal', 'scrapbook', 'mood', 'series']).optional(),
  headline: z.string().max(90).optional(), tagline: z.string().max(150).optional(),
  promoImage: z.string().url().regex(/^https?:\/\//).max(2048).optional(),
  backgroundImage: z.string().url().regex(/^https?:\/\//).max(2048).optional(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  badgeText: z.enum(['Sponsored Story', 'Sponsored Pick', 'Promoted Story']).optional(),
  ctaText: z.enum(['Read Story', 'Start Reading', 'Continue Series', 'Read New Chapter']).optional(),
  mood: z.enum(['romance', 'fantasy', 'horror', 'comedy', 'drama', 'mystery', 'action', 'sci-fi']).optional(),
  fontStyle: z.enum(['sans', 'serif', 'handwritten']).optional(),
  showGenres: z.boolean().optional(), showSave: z.boolean().optional(), seriesLabel: z.string().max(65).optional(),
});
