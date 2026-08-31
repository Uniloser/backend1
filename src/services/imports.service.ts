// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Service
// ─────────────────────────────────────────────────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../utils/ApiError';
import * as storiesRepository from '../repositories/stories.repository';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as importsRepository from '../repositories/imports.repository';
import { detectFileType, type ImportContext, type NormalizedDocument } from './importers/types';
import { extractDocx } from './importers/docxImporter';
import { extractPdf } from './importers/pdfImporter';
import { detectChapterBoundaries, splitBlocksIntoChapters } from './importers/chapterDetector';
import { buildNormalizedChapter } from './importers/contentNormalizer';
import { deleteImportImages, deleteManuscriptFile } from './importers/imageExtractor';
import { sanitizeHtml, sanitizeTitle } from './importers/sanitizer';
import { getSupabaseAdmin, supabase } from '../config/supabase';

const MANUSCRIPTS_BUCKET = 'manuscripts';

function getStorageClient() {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

async function uploadManuscriptFile(
  fileBuffer: Buffer,
  context: ImportContext,
  originalFilename: string,
  mimeType: string,
): Promise<string | null> {
  const safeExt = originalFilename.split('.').pop()?.toLowerCase() ?? 'bin';
  const storagePath = `${context.userId}/${context.storyId}/${context.importId}/original.${safeExt}`;

  try {
    const client = getStorageClient();
    const { error } = await client.storage
      .from(MANUSCRIPTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`[ImportsService] Storage upload notice:`, error.message);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.warn('[ImportsService] Storage error notice:', err);
    return null;
  }
}

export async function processImport(
  file: any,
  storyId: string,
  userId: string,
) {
  const story = await storiesRepository.findStory(storyId);
  if (!story) {
    throw new ApiError(404, 'Story not found');
  }

  if (story.author_id !== userId) {
    throw new ApiError(403, 'You do not have permission to import into this story');
  }

  const fileType = detectFileType(file.originalname);
  if (!fileType) {
    throw new ApiError(415, 'Only .pdf and .docx files are supported');
  }

  const importId = uuidv4();
  const context: ImportContext = {
    importId,
    storyId,
    userId,
  };

  const storagePath = await uploadManuscriptFile(
    file.buffer,
    context,
    file.originalname,
    file.mimetype || (fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  );

  await importsRepository.createImport({
    id: importId,
    story_id: storyId,
    user_id: userId,
    original_filename: file.originalname,
    storage_path: storagePath,
    file_type: fileType,
    file_size: file.size,
    status: 'PROCESSING',
    error_message: null,
    result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  try {
    let blocks;
    const warnings: string[] = [];
    let imageCount = 0;

    if (fileType === 'docx') {
      const result = await extractDocx(file.buffer, context);
      blocks = result.blocks;
      warnings.push(...result.warnings);
      imageCount = result.imageCount;
    } else {
      const result = await extractPdf(file.buffer, context);

      if (result.isScanned) {
        const scannedResult: NormalizedDocument = {
          chapters: [],
          totalWords: 0,
          totalImages: 0,
          isScannedPdf: true,
          warnings: result.warnings,
        };
        await importsRepository.updateImport(importId, 'COMPLETED', { result: scannedResult });
        return {
          importId,
          status: 'COMPLETED',
          chapterCount: 0,
          totalWords: 0,
          totalImages: 0,
          isScannedPdf: true,
          warnings: result.warnings,
        };
      }

      blocks = result.blocks;
      warnings.push(...result.warnings);
    }

    if (!blocks || blocks.length === 0) {
      throw new ApiError(422, 'No extractable text or content found in document');
    }

    const boundaries = detectChapterBoundaries(blocks);
    const rawChapters = splitBlocksIntoChapters(blocks, boundaries);

    if (rawChapters.length === 0) {
      throw new ApiError(422, 'No chapters could be detected in document');
    }

    const chapters = rawChapters.map((ch, i) =>
      buildNormalizedChapter(ch.title, i + 1, ch.blocks),
    );

    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    const normalizedDoc: NormalizedDocument = {
      chapters,
      totalWords,
      totalImages: imageCount,
      isScannedPdf: false,
      warnings,
    };

    await importsRepository.updateImport(importId, 'COMPLETED', { result: normalizedDoc });

    return {
      importId,
      status: 'COMPLETED',
      chapterCount: chapters.length,
      totalWords,
      totalImages: imageCount,
      isScannedPdf: false,
      warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to parse manuscript';
    await importsRepository.updateImport(importId, 'FAILED', { error_message: msg });
    await deleteImportImages(context);

    if (err instanceof ApiError) throw err;
    throw new ApiError(422, `Manuscript processing error: ${msg}`);
  }
}

export async function getImportPreview(importId: string, userId: string) {
  const record = await importsRepository.findImportById(importId, userId);
  if (!record) {
    throw new ApiError(404, 'Import record not found');
  }

  if (record.status !== 'COMPLETED') {
    throw new ApiError(400, `Import is not ready for preview (status: ${record.status})`);
  }

  const result = record.result;
  if (!result) {
    throw new ApiError(500, 'Import result data is missing');
  }

  return {
    importId: record.id,
    storyId: record.story_id,
    originalFilename: record.original_filename,
    fileType: record.file_type,
    totalWords: result.totalWords,
    totalImages: result.totalImages,
    isScannedPdf: result.isScannedPdf ?? false,
    warnings: result.warnings,
    chapters: result.chapters.map((ch) => ({
      order: ch.order,
      title: ch.title,
      wordCount: ch.wordCount,
      html: ch.html,
      blockCount: ch.blocks.length,
    })),
  };
}

export async function commitImport(
  importId: string,
  userId: string,
  chapters: Array<{ title: string; html: string; order?: number }>,
) {
  const record = await importsRepository.findImportById(importId, userId);
  if (!record) {
    throw new ApiError(404, 'Import record not found');
  }

  if (record.status !== 'COMPLETED') {
    throw new ApiError(400, `Import cannot be committed in status ${record.status}`);
  }

  const story = await storiesRepository.findStory(record.story_id);
  if (!story || story.author_id !== userId) {
    throw new ApiError(403, 'You do not have permission to modify this story');
  }

  let nextOrder = await chaptersRepository.findNextChapterOrder(record.story_id);
  const createdIds: string[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const cleanTitle = sanitizeTitle(ch.title) || `Chapter ${nextOrder}`;
    const cleanHtml = sanitizeHtml(ch.html || '<p></p>');

    const created = await chaptersRepository.createChapter({
      story_id: record.story_id,
      title: cleanTitle,
      content: cleanHtml,
      content_type: (story.content_type as 'text' | 'comic') ?? 'text',
      status: 'draft',
      chapter_order: nextOrder,
      published_at: null,
    });

    if (created?.id) {
      createdIds.push(created.id);
    }
    nextOrder++;
  }

  return {
    storyId: record.story_id,
    createdCount: createdIds.length,
    chapterIds: createdIds,
  };
}

export async function deleteImport(importId: string, userId: string) {
  const record = await importsRepository.findImportById(importId, userId);
  if (!record) {
    throw new ApiError(404, 'Import record not found');
  }

  const context: ImportContext = {
    importId,
    storyId: record.story_id,
    userId,
  };

  await deleteImportImages(context);
  if (record.storage_path) {
    await deleteManuscriptFile(record.storage_path);
  }

  await importsRepository.updateImport(importId, 'CANCELLED');
}
