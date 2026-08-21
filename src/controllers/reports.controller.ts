import * as reportsService from '../services/reports.service';
import { createReportSchema } from '../validators/reports.validator';

export async function createReport(request: any, response: any) {
	const input = createReportSchema.parse(request.body);
	const report = await reportsService.createReport(request.user.id, input);
	response.status(201).json({ data: report });
}