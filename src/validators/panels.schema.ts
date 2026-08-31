const { z } = require('zod') as {
	z: any;
};

export const createPanelSchema = z.object({
	image_url: z.string().url(),
	width: z.number().int().positive().nullable().optional(),
	height: z.number().int().positive().nullable().optional(),
});

export const updatePanelSchema = z.object({
	image_url: z.string().url().optional(),
	width: z.number().int().positive().nullable().optional(),
	height: z.number().int().positive().nullable().optional(),
}).refine(
	(data: { image_url?: string; width?: number | null; height?: number | null }) => (
		data.image_url !== undefined || data.width !== undefined || data.height !== undefined
	),
	{ message: 'At least one field must be provided' },
);

export const reorderPanelsSchema = z.object({
	panels: z.array(z.object({
		id: z.string().uuid(),
		panel_order: z.number().int().positive(),
	})).min(1),
});

export type CreatePanelInput = {
	image_url: string;
	width?: number | null;
	height?: number | null;
};

export type UpdatePanelInput = Partial<CreatePanelInput>;

export type ReorderPanelsInput = {
	panels: Array<{ id: string; panel_order: number }>;
};
