import { z } from 'zod';

const bannerPositionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

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
  bannerSize: z.enum(['compact', 'standard', 'tall', 'custom']).optional(),
  desktopHeight: z.number().int().min(250).max(900).optional(),
  mobileHeight: z.number().int().min(300).max(900).optional(),
  positions: z.object({
    brand: bannerPositionSchema.optional(),
    headline: bannerPositionSchema.optional(),
    tagline: bannerPositionSchema.optional(),
    boldText: bannerPositionSchema.optional(),
    cta: bannerPositionSchema.optional(),
  }).optional(),
  textScale: z.object({
    brand: z.number().min(0.25).max(3).optional(),
    headline: z.number().min(0.25).max(3).optional(),
    tagline: z.number().min(0.25).max(3).optional(),
    boldText: z.number().min(0.25).max(3).optional(),
  }).optional(),
  buttonStyle: z.object({
    width: z.number().min(50).max(200).optional(),
    height: z.number().min(50).max(200).optional(),
    radius: z.number().min(0).max(30).optional(),
  }).optional(),
  textAlign: z.enum(['left', 'center']).optional(),
  textColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  overlayColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  showBrand: z.boolean().optional(),
  artwork: z.array(z.object({
    url: z.string().url().regex(/^https?:\/\//).max(2048),
    alt: z.string().max(120).optional(),
    side: z.enum(['left', 'right']),
    rotation: z.number().min(-180).max(180),
    shape: z.enum(['square', 'rounded', 'circle']).optional(),
    size: z.object({ width: z.number().min(5).max(100), height: z.number().min(5).max(100) }).optional(),
    position: bannerPositionSchema.optional(),
  })).max(8).optional(),
});
