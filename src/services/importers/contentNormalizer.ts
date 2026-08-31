// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Content Normalizer
// ─────────────────────────────────────────────────────────────────────────────
import type { ContentBlock, NormalizedChapter } from './types';
import { sanitizeHtml, stripHtml } from './sanitizer';

function blockToHtml(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph': {
      const clean = sanitizeHtml(block.html);
      if (!clean || !stripHtml(clean).trim()) return '';
      return clean.startsWith('<p') ? clean : `<p>${clean}</p>`;
    }

    case 'heading': {
      const level = Math.min(Math.max(block.level, 1), 3);
      const text = sanitizeHtml(block.text);
      return `<h${level}>${text}</h${level}>`;
    }

    case 'image': {
      const alt = sanitizeHtml(block.alt || 'Image');
      return `<img src="${block.signedUrl}" alt="${alt}" data-storage-path="${block.storagePath}" />`;
    }

    case 'divider':
    case 'pageBreak':
      return '<hr />';

    default:
      return '';
  }
}

export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map(blockToHtml).filter(Boolean).join('\n');
}

export function countWords(blocks: ContentBlock[]): number {
  return blocks.reduce((sum, block) => {
    let text = '';
    if (block.type === 'paragraph') text = stripHtml(block.html);
    else if (block.type === 'heading') text = block.text;
    return sum + text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
}

export function buildNormalizedChapter(
  title: string,
  order: number,
  blocks: ContentBlock[],
): NormalizedChapter {
  return {
    title: title.trim() || `Chapter ${order}`,
    order,
    blocks,
    html: blocksToHtml(blocks),
    wordCount: countWords(blocks),
  };
}

