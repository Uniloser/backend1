"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitImportSchema = void 0;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────
const zod_1 = require("zod");
exports.commitImportSchema = zod_1.z.object({
    chapters: zod_1.z
        .array(zod_1.z.object({
        title: zod_1.z.string().min(1, 'Chapter title is required').max(255),
        html: zod_1.z.string(),
        order: zod_1.z.number().int().positive().optional(),
    }))
        .min(1, 'At least one chapter is required to commit'),
});
