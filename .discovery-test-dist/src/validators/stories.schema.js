"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuerySchema = exports.discoveryQuerySchema = exports.updateStorySchema = exports.createStorySchema = void 0;
const { z } = require('zod');
const contentType = z.enum(['text', 'comic']);
const genre = z.string().trim().min(1).max(80);
const storyFields = {
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5_000).nullable().optional(),
    genre,
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    cover_url: z.string().url().nullable().optional(),
    content_type: contentType.optional(),
};
exports.createStorySchema = z.object(storyFields);
exports.updateStorySchema = z.object({
    ...storyFields,
    status: z.enum(['draft', 'published']).optional(),
    is_complete: z.boolean().optional(),
    is_mature: z.boolean().optional(),
    visibility: z.enum(['public', 'private', 'unlisted']).optional(),
}).partial();
exports.discoveryQuerySchema = z.object({
    genre: genre.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
exports.searchQuerySchema = z.object({
    q: z.string().trim().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
// Story Zod schema stub.
// TODO: validate title, description, genre, tags, and allowed status transitions;
// keep author_id and other server-owned fields out of client input.
