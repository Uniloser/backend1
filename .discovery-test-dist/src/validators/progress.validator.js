"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storyIdSchema = exports.progressSchema = void 0;
const { z } = require('zod');
exports.progressSchema = z.object({
    last_chapter_id: z.string().uuid().nullable(),
    last_panel_index: z.number().int().min(0).nullable().optional(),
    completed_chapter_id: z.string().uuid().nullable().optional(),
});
exports.storyIdSchema = z.string().uuid();
// Reading-progress Zod schema stub.
// TODO: validate story id and last_chapter_id; verify relationship in the
// service before writing and never accept user_id from input.
