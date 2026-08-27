import * as analyticsRepository from '../repositories/analytics.repository';

export function getAuthorAnalytics(authorId: string) {
	return analyticsRepository.getAuthorAnalytics(authorId);
}