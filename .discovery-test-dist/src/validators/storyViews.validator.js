"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordStoryViewSchema = exports.storyIdSchema = void 0;
const { z } = require('zod');
exports.storyIdSchema = z.string().uuid();
exports.recordStoryViewSchema = z.object({
    chapter_id: z.string().uuid().nullable().optional(),
    session_id: z.string().trim().min(1).max(200).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
