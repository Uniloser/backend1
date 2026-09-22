"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyIdSchema = exports.bookmarkIdSchema = exports.createBookmarkSchema = void 0;
const { z } = require('zod');
exports.createBookmarkSchema = z.object({
    story_id: z.string().uuid(),
    chapter_id: z.string().uuid().nullable().optional(),
    note: z.string().trim().max(2_000).nullable().optional(),
});
exports.bookmarkIdSchema = z.string().uuid();
exports.storyIdSchema = z.string().uuid();
