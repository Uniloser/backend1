// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const commitImportSchema = z.object({
  chapters: z
    .array(
      z.object({
        title: z.string().min(1, 'Chapter title is required').max(255),
        html: z.string(),
        order: z.number().int().positive().optional(),
      })
    )
    .min(1, 'At least one chapter is required to commit'),
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;

