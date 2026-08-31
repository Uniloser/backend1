// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — DOCX Importer
// ─────────────────────────────────────────────────────────────────────────────
import mammoth from 'mammoth';
import type { ContentBlock, ImportContext } from './types';
import { sanitizeHtml } from './sanitizer';
import { uploadImages } from './imageExtractor';

interface ExtractedImage {
  buffer: Buffer;
  mimeType: string;
  alt?: string;
}

interface DocxExtractionResult {
  blocks: ContentBlock[];
  warnings: string[];
  imageCount: number;
}

export async function extractDocx(
  fileBuffer: Buffer,
  context: ImportContext,
): Promise<DocxExtractionResult> {
  const warnings: string[] = [];
  const extractedImages: ExtractedImage[] = [];

  let rawHtml = '';
  let mammothWarnings: string[] = [];

  try {
    const result = await mammoth.convertToHtml(
      { buffer: fileBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            const buffer = Buffer.from(await image.read('base64'), 'base64');
            const mimeType = image.contentType ?? 'image/png';
            extractedImages.push({ buffer, mimeType, alt: '' });
            return { src: `__IMAGE_PLACEHOLDER_${extractedImages.length - 1}__` };
          } catch {
            warnings.push('One or more images could not be extracted from the document.');
            return { src: '' };
          }
        }),
        styleMap: [
          'p[style-name="Heading 1"] => h1:fresh',
          'p[style-name="Heading 2"] => h2:fresh',
          'p[style-name="Heading 3"] => h3:fresh',
          'p[style-name="Heading 4"] => h4:fresh',
          'p[style-name="Title"] => h1:fresh',
          'p[style-name="Subtitle"] => h2:fresh',
          'p[style-name="Chapter"] => h2:fresh',
          'r[style-name="Strong"] => strong',
          'r[style-name="Emphasis"] => em',
        ],
      },
    );

    rawHtml = result.value;
    mammothWarnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    if (mammothWarnings.length > 0) {
      warnings.push(...mammothWarnings.slice(0, 5));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse DOCX file: ${msg}`);
  }

  if (!rawHtml.trim()) {
    warnings.push('The document appears to be empty.');
    return { blocks: [], warnings, imageCount: 0 };
  }

  const uploadedImages = await uploadImages(extractedImages, context);
  const blocks = parseHtmlToBlocks(rawHtml, uploadedImages);

  return {
    blocks,
    warnings,
    imageCount: uploadedImages.length,
  };
}

function parseHtmlToBlocks(
  html: string,
  uploadedImages: Array<{ storagePath: string; signedUrl: string; alt: string }>,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  const tagPattern = /<(h[1-6]|p|ul|ol|li|hr|blockquote|figure|img)[^>]*>[\s\S]*?<\/\1>|<hr\s*\/?>/gi;
  const matches = html.match(tagPattern) ?? [];
  const segments = matches.length > 0 ? matches : html.split(/\n{2,}/);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^<(h[1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (headingMatch) {
      const level = parseInt(headingMatch[1].slice(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      const text = headingMatch[2].replace(/<[^>]+>/g, '').trim();
      if (text) {
        blocks.push({ type: 'heading', level, text });
      }
      continue;
    }

    if (/<hr\s*\/?>/i.test(trimmed)) {
      blocks.push({ type: 'divider' });
      continue;
    }

    const placeholderMatch = trimmed.match(/__IMAGE_PLACEHOLDER_(\d+)__/);
    if (placeholderMatch) {
      const idx = parseInt(placeholderMatch[1], 10);
      const img = uploadedImages[idx];
      if (img) {
        blocks.push({
          type: 'image',
          storagePath: img.storagePath,
          signedUrl: img.signedUrl,
          alt: img.alt,
        });
      }
      continue;
    }

    if (trimmed.includes('__IMAGE_PLACEHOLDER_')) {
      const imgPlaceholders = trimmed.matchAll(/__IMAGE_PLACEHOLDER_(\d+)__/g);
      for (const m of imgPlaceholders) {
        const idx = parseInt(m[1], 10);
        const img = uploadedImages[idx];
        if (img) {
          blocks.push({
            type: 'image',
            storagePath: img.storagePath,
            signedUrl: img.signedUrl,
            alt: img.alt,
          });
        }
      }
      const textOnly = trimmed.replace(/__IMAGE_PLACEHOLDER_\d+__/g, '').replace(/<[^>]+>/g, '').trim();
      if (textOnly) {
        blocks.push({ type: 'paragraph', html: sanitizeHtml(`<p>${textOnly}</p>`) });
      }
      continue;
    }

    if (/^<ul|^<ol/i.test(trimmed)) {
      blocks.push({ type: 'paragraph', html: sanitizeHtml(trimmed) });
      continue;
    }

    if (/^<blockquote/i.test(trimmed)) {
      blocks.push({ type: 'paragraph', html: sanitizeHtml(trimmed) });
      continue;
    }

    const cleanHtml = sanitizeHtml(trimmed.startsWith('<p') ? trimmed : `<p>${trimmed}</p>`);
    const textContent = cleanHtml.replace(/<[^>]+>/g, '').trim();
    if (textContent) {
      blocks.push({ type: 'paragraph', html: cleanHtml });
    }
  }

  return blocks;
}

