const { z } = require('zod') as { z: any };

export const createReportSchema = z.object({
	category: z.enum(['bug', 'malfunction', 'technical_issue', 'abuse', 'harassment', 'spam', 'copyright', 'inappropriate_content', 'account_issue', 'other']),
	description: z.string().trim().min(1).max(10_000),
});

export type CreateReportInput = {
	category: string;
	description: string;
};