// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Manuscript Import Types
// ─────────────────────────────────────────────────────────────────────────────

export type ImportStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ImportFileType = 'pdf' | 'docx';

export type ContentBlock =
  | { type: 'paragraph'; html: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'image'; storagePath: string; signedUrl: string; alt: string }
  | { type: 'pageBreak' }
  | { type: 'divider' };

export interface NormalizedChapter {
  title: string;
  order: number;
  blocks: ContentBlock[];
  html: string;
  wordCount: number;
}

export interface NormalizedDocument {
  chapters: NormalizedChapter[];
  totalWords: number;
  totalImages: number;
  isScannedPdf?: boolean;
  warnings: string[];
}

export interface ManuscriptImportRecord {
  id: string;
  story_id: string;
  user_id: string;
  original_filename: string;
  storage_path: string | null;
  file_type: ImportFileType;
  file_size: number;
  status: ImportStatus;
  error_message: string | null;
  result: NormalizedDocument | null;
  created_at: string;
  updated_at: string;
}

export interface ImportContext {
  importId: string;
  storyId: string;
  userId: string;
}

export const ALLOWED_EXTENSIONS: ImportFileType[] = ['pdf', 'docx'];

export function detectFileType(filename: string): ImportFileType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  return null;
}

