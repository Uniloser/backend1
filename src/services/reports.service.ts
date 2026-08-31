import * as reportsRepository from '../repositories/reports.repository';
import type { CreateReportInput } from '../validators/reports.validator';

export function createReport(userId: string, input: CreateReportInput) {
	return reportsRepository.createReport(userId, input);
}