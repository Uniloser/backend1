"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderPanelsSchema = exports.updatePanelSchema = exports.createPanelSchema = void 0;
const { z } = require('zod');
exports.createPanelSchema = z.object({
    image_url: z.string().url(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
});
exports.updatePanelSchema = z.object({
    image_url: z.string().url().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
}).refine((data) => (data.image_url !== undefined || data.width !== undefined || data.height !== undefined), { message: 'At least one field must be provided' });
exports.reorderPanelsSchema = z.object({
    panels: z.array(z.object({
        id: z.string().uuid(),
        panel_order: z.number().int().positive(),
    })).min(1),
});
