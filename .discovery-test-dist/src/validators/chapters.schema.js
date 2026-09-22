"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderChaptersSchema = exports.updateChapterStatusSchema = exports.updateChapterSchema = exports.createChapterSchema = void 0;
const { z } = require('zod');
const contentType = z.enum(['text', 'comic']);
const chapterFields = {
    title: z.string().trim().min(1).max(200),
    content: z.string().max(500_000).optional(),
    content_type: contentType.optional(),
};
exports.createChapterSchema = z.object({
    ...chapterFields,
    status: z.enum(['draft', 'published']).default('draft'),
}).superRefine((data, ctx) => {
    const type = data.content_type ?? 'text';
    if (type === 'text' && (!data.content || data.content.trim().length === 0)) {
        ctx.addIssue({
            code: 'custom',
            message: 'Text chapters require content',
            path: ['content'],
        });
    }
});
// Content update schema – status is optional with NO default so auto-saves
// that omit it will never accidentally overwrite the existing status.
exports.updateChapterSchema = z.object({
    title: chapterFields.title.optional(),
    content: chapterFields.content,
    content_type: chapterFields.content_type,
    status: z.enum(['draft', 'published']).optional(),
}).superRefine((data, ctx) => {
    if (data.content_type === 'text' && data.content !== undefined && data.content.trim().length === 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'Text chapters require content',
            path: ['content'],
        });
    }
});
// Dedicated status-only update schema used by PATCH /chapters/:id/status.
exports.updateChapterStatusSchema = z.object({
    status: z.enum(['draft', 'published']),
});
exports.reorderChaptersSchema = z.object({
    chapters: z.array(z.object({
        id: z.string().uuid(),
        chapter_order: z.number().int().positive(),
    })).min(1),
});
