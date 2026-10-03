import * as storyAdsService from '../services/storyAds.service';

export async function getActiveAd(request: any, response: any) {
	const sessionId = typeof request.query?.session_id === 'string' ? request.query.session_id : undefined;
	response.json({ data: await storyAdsService.getActiveAd({ userId: request.user?.id, sessionId }) });
}

export async function recordImpression(request: any, response: any) {
	response.json({ data: await storyAdsService.recordEvent(request.params.id, 'impression', request.user?.id, request.body?.session_id) });
}

export async function recordClick(request: any, response: any) {
	response.json({ data: await storyAdsService.recordEvent(request.params.id, 'click', request.user?.id, request.body?.session_id) });
}