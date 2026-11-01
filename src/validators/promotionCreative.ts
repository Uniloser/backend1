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
  siteLayout: z.enum(['announcement', 'hero']).optional(),
  textAlign: z.enum(['left', 'center']).optional(),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  overlayColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  showBrand: z.boolean().optional(),
  artwork: z.array(z.object({
    url: z.string().url().regex(/^https?:\/\//).max(2048),
    alt: z.string().max(120).optional(),
    side: z.enum(['left', 'right']),
    rotation: z.number().min(-20).max(20),
  })).max(8).optional(),
});
