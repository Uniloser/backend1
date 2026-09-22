"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportSchema = void 0;
const { z } = require('zod');
exports.createReportSchema = z.object({
    category: z.enum(['bug', 'malfunction', 'technical_issue', 'abuse', 'harassment', 'spam', 'copyright', 'inappropriate_content', 'account_issue', 'other']),
    description: z.string().trim().min(1).max(10_000),
    story_id: z.string().uuid().optional(),
    chapter_id: z.string().uuid().optional(),
    comment_id: z.string().uuid().optional(),
    reported_user_id: z.string().uuid().optional(),
}).refine((input) => [input.story_id, input.chapter_id, input.comment_id, input.reported_user_id].filter(Boolean).length <= 1, { message: 'Report one content item or user at a time.' });
