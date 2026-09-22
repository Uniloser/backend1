"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityVoteInput = exports.communityEditInput = exports.communityCommentInput = exports.communityPostInput = exports.communityQuery = exports.communityId = void 0;
const zod_1 = require("zod");
const text = (max) => zod_1.z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Invalid control characters');
exports.communityId = zod_1.z.string().uuid();
exports.communityQuery = zod_1.z.object({
    tab: zod_1.z
        .enum(['for-you', 'following', 'discussions', 'saved'])
        .default('for-you'),
    limit: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(30)
        .default(15),
    offset: zod_1.z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .default(0),
});
exports.communityPostInput = zod_1.z
    .object({
    content: text(4000),
    post_type: zod_1.z
        .enum([
        'post',
        'chapter',
        'announcement',
        'poll',
        'discussion',
    ])
        .default('post'),
    story_id: exports.communityId
        .nullable()
        .optional(),
    chapter_id: exports.communityId
        .nullable()
        .optional(),
    contains_spoiler: zod_1.z.boolean().default(false),
    image_url: zod_1.z
        .string()
        .url()
        .max(2000)
        .nullable()
        .optional(),
    poll_options: zod_1.z
        .array(text(100))
        .min(2)
        .max(4)
        .nullable()
        .optional(),
})
    .superRefine((value, ctx) => {
    // A chapter must belong to a selected story.
    if (value.chapter_id && !value.story_id) {
        ctx.addIssue({
            code: 'custom',
            message: 'Select a story for this chapter.',
        });
    }
    // Chapter posts require a chapter.
    if (value.post_type === 'chapter' && !value.chapter_id) {
        ctx.addIssue({
            code: 'custom',
            message: 'Select a published chapter.',
        });
    }
    // Polls require 2–4 distinct options.
    if (value.post_type === 'poll' &&
        (!value.poll_options ||
            new Set(value.poll_options.map((option) => option.toLowerCase())).size !== value.poll_options.length)) {
        ctx.addIssue({
            code: 'custom',
            message: 'Provide 2–4 distinct poll options.',
        });
    }
    // Non-poll posts cannot contain poll options.
    if (value.post_type !== 'poll' && value.poll_options) {
        ctx.addIssue({
            code: 'custom',
            message: 'Only polls can have options.',
        });
    }
});
exports.communityCommentInput = zod_1.z.object({
    content: text(2000),
    parent_comment_id: exports.communityId
        .nullable()
        .optional(),
});
exports.communityEditInput = zod_1.z.object({
    content: text(4000),
});
exports.communityVoteInput = zod_1.z.object({
    option_index: zod_1.z
        .number()
        .int()
        .min(0)
        .max(3),
});
