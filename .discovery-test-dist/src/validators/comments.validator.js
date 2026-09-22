"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentsPaginationSchema = exports.createCommentSchema = void 0;
const { z } = require('zod');
exports.createCommentSchema = z.object({
    text: z.string().trim().min(1).max(2_000),
});
exports.commentsPaginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
// Comment Zod schema stub.
// TODO: validate comment text length and pagination parameters; exclude user_id
// because identity must come from req.user.id.
