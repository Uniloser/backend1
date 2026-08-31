import * as analyticsService from '../services/analytics.service';

export async function getAuthorAnalytics(request: any, response: any) {
	response.json({ data: await analyticsService.getAuthorAnalytics(request.user.id) });
}