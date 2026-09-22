"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.userIdSchema = void 0;
const { z } = require('zod');
exports.userIdSchema = z.string().uuid();
exports.paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
// Follow Zod schema stub.
// TODO: validate target user ids and follower/following pagination inputs;
// enforce identity from req.user rather than request body.
