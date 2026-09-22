"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processImport = processImport;
exports.getImportPreview = getImportPreview;
exports.commitImport = commitImport;
exports.deleteImport = deleteImport;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Service
// ─────────────────────────────────────────────────────────────────────────────
const uuid_1 = require("uuid");
const ApiError_1 = require("../utils/ApiError");
const storiesRepository = __importStar(require("../repositories/stories.repository"));
const chaptersRepository = __importStar(require("../repositories/chapters.repository"));
const importsRepository = __importStar(require("../repositories/imports.repository"));
const types_1 = require("./importers/types");
const docxImporter_1 = require("./importers/docxImporter");
const pdfImporter_1 = require("./importers/pdfImporter");
const chapterDetector_1 = require("./importers/chapterDetector");
const contentNormalizer_1 = require("./importers/contentNormalizer");
const imageExtractor_1 = require("./importers/imageExtractor");
const sanitizer_1 = require("./importers/sanitizer");
const supabase_1 = require("../config/supabase");
const MANUSCRIPTS_BUCKET = 'manuscripts';
function getStorageClient() {
    try {
        return (0, supabase_1.getSupabaseAdmin)();
    }
    catch {
        return supabase_1.supabase;
    }
}
async function uploadManuscriptFile(fileBuffer, context, originalFilename, mimeType) {
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
    }
    catch (err) {
        console.warn('[ImportsService] Storage error notice:', err);
        return null;
    }
}
async function processImport(file, storyId, userId) {
    const story = await storiesRepository.findStory(storyId);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (story.author_id !== userId) {
        throw new ApiError_1.ApiError(403, 'You do not have permission to import into this story');
    }
    const fileType = (0, types_1.detectFileType)(file.originalname);
    if (!fileType) {
        throw new ApiError_1.ApiError(415, 'Only .pdf and .docx files are supported');
    }
    const importId = (0, uuid_1.v4)();
    const context = {
        importId,
        storyId,
        userId,
    };
    const storagePath = await uploadManuscriptFile(file.buffer, context, file.originalname, file.mimetype || (fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
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
        const warnings = [];
        let imageCount = 0;
        if (fileType === 'docx') {
            const result = await (0, docxImporter_1.extractDocx)(file.buffer, context);
            blocks = result.blocks;
            warnings.push(...result.warnings);
            imageCount = result.imageCount;
        }
        else {
            const result = await (0, pdfImporter_1.extractPdf)(file.buffer, context);
            if (result.isScanned) {
                const scannedResult = {
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
            throw new ApiError_1.ApiError(422, 'No extractable text or content found in document');
        }
        const boundaries = (0, chapterDetector_1.detectChapterBoundaries)(blocks);
        const rawChapters = (0, chapterDetector_1.splitBlocksIntoChapters)(blocks, boundaries);
        if (rawChapters.length === 0) {
            throw new ApiError_1.ApiError(422, 'No chapters could be detected in document');
        }
        const chapters = rawChapters.map((ch, i) => (0, contentNormalizer_1.buildNormalizedChapter)(ch.title, i + 1, ch.blocks));
        const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
        const normalizedDoc = {
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
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to parse manuscript';
        await importsRepository.updateImport(importId, 'FAILED', { error_message: msg });
        await (0, imageExtractor_1.deleteImportImages)(context);
        if (err instanceof ApiError_1.ApiError)
            throw err;
        throw new ApiError_1.ApiError(422, `Manuscript processing error: ${msg}`);
    }
}
async function getImportPreview(importId, userId) {
    const record = await importsRepository.findImportById(importId, userId);
    if (!record) {
        throw new ApiError_1.ApiError(404, 'Import record not found');
    }
    if (record.status !== 'COMPLETED') {
        throw new ApiError_1.ApiError(400, `Import is not ready for preview (status: ${record.status})`);
    }
    const result = record.result;
    if (!result) {
        throw new ApiError_1.ApiError(500, 'Import result data is missing');
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
async function commitImport(importId, userId, chapters) {
    const record = await importsRepository.findImportById(importId, userId);
    if (!record) {
        throw new ApiError_1.ApiError(404, 'Import record not found');
    }
    if (record.status !== 'COMPLETED') {
        throw new ApiError_1.ApiError(400, `Import cannot be committed in status ${record.status}`);
    }
    const story = await storiesRepository.findStory(record.story_id);
    if (!story || story.author_id !== userId) {
        throw new ApiError_1.ApiError(403, 'You do not have permission to modify this story');
    }
    let nextOrder = await chaptersRepository.findNextChapterOrder(record.story_id);
    const createdIds = [];
    for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const cleanTitle = (0, sanitizer_1.sanitizeTitle)(ch.title) || `Chapter ${nextOrder}`;
        const cleanHtml = (0, sanitizer_1.sanitizeHtml)(ch.html || '<p></p>');
        const created = await chaptersRepository.createChapter({
            story_id: record.story_id,
            title: cleanTitle,
            content: cleanHtml,
            content_type: story.content_type ?? 'text',
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
async function deleteImport(importId, userId) {
    const record = await importsRepository.findImportById(importId, userId);
    if (!record) {
        throw new ApiError_1.ApiError(404, 'Import record not found');
    }
    const context = {
        importId,
        storyId: record.story_id,
        userId,
    };
    await (0, imageExtractor_1.deleteImportImages)(context);
    if (record.storage_path) {
        await (0, imageExtractor_1.deleteManuscriptFile)(record.storage_path);
    }
    await importsRepository.updateImport(importId, 'CANCELLED');
}
