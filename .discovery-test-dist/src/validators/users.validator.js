"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.usernameSchema = void 0;
const { z } = require('zod');
exports.usernameSchema = z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/i);
exports.updateProfileSchema = z.object({
    bio: z.string().trim().max(500).nullable().optional(),
    display_name: z.string().trim().min(1).max(100).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
});
// User Zod schema stub.
// TODO: validate username format and bio length limits for profile creation/
// lookup contracts, plus display_name and avatar_url update constraints.
// TODO: keep id, follower counts, and published stories server-owned.
