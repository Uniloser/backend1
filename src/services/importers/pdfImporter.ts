// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — PDF Importer
// ─────────────────────────────────────────────────────────────────────────────
import type { ContentBlock, ImportContext } from './types';
import { sanitizeHtml } from './sanitizer';

async function getPdfParse() {
  const mod: any = await import('pdf-parse');
  return (mod.default ?? mod) as (
    dataBuffer: Buffer,
    options?: { max?: number }
  ) => Promise<{ text: string; numpages: number; numrender: number; info: any; metadata: any; version: string }>;
}

interface PdfExtractionResult {
  blocks: ContentBlock[];
  warnings: string[];
  pageCount: number;
  isScanned: boolean;
}

const MIN_CHARS_PER_PAGE = 50;

export async function extractPdf(
  fileBuffer: Buffer,
  _context: ImportContext,
): Promise<PdfExtractionResult> {
  const warnings: string[] = [];

  let pdfData: { text: string; numpages: number };

  try {
    const pdfParse = await getPdfParse();
    pdfData = await pdfParse(fileBuffer, { max: 500 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
      throw new Error('This PDF is password-protected. Please remove the password before importing.');
    }

    throw new Error(`Failed to parse PDF: ${msg}`);
  }

  const { text, numpages } = pdfData;
  const pageCount = numpages ?? 1;

  const textLength = (text ?? '').replace(/\s+/g, '').length;
  const charsPerPage = pageCount > 0 ? textLength / pageCount : 0;
  const isScanned = charsPerPage < MIN_CHARS_PER_PAGE;

  if (isScanned) {
    return {
      blocks: [],
      warnings: [
        'This PDF appears to be scanned or image-based and contains little extractable text. ' +
          'OCR (optical character recognition) is required to import this type of document. ' +
          'Please export your manuscript as a text-based PDF or DOCX file.',
      ],
      pageCount,
      isScanned: true,
    };
  }

  if (!text || !text.trim()) {
    return {
      blocks: [],
      warnings: ['The PDF contains no extractable text.'],
      pageCount,
      isScanned: false,
    };
  }

  const blocks = parsePdfTextToBlocks(text);

  return { blocks, warnings, pageCount, isScanned: false };
}

function parsePdfTextToBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawParagraphs = normalized.split(/\n{2,}/);

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (isChapterLine(trimmed)) {
      blocks.push({
        type: 'heading',
        level: 2,
        text: trimmed,
      });
      continue;
    }

    const joinedText = trimmed.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
    const html = sanitizeHtml(`<p>${escapeHtml(joinedText)}</p>`);
    if (html) {
      blocks.push({ type: 'paragraph', html });
    }
  }

  return blocks;
}

function isChapterLine(text: string): boolean {
  if (text.length > 120) return false;
  if (text.includes('\n')) return false;

  const patterns = [
    /^chapter\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivxlcdm]+)[\s:.\-—]*/i,
    /^part\s+(\d+|one|two|three|four|five|[ivxlcdm]+)[\s:.\-—]*/i,
    /^(prologue|epilogue|preface|introduction|foreword|afterword|interlude|appendix)[\s:.\-—]*/i,
    /^act\s+(\d+|one|two|three|[ivxlcdm]+)[\s:.\-—]*/i,
  ];

  return patterns.some((p) => p.test(text.trim()));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

