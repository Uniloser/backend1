import * as storyAdsService from '../services/storyAds.service';

export async function getActiveAd(_request: any, response: any) {
	response.json({ data: await storyAdsService.getActiveAd() });
}

export async function recordImpression(request: any, response: any) {
	response.json({ data: await storyAdsService.recordEvent(request.params.id, 'impression', request.user?.id, request.body?.session_id) });
}

export async function recordClick(request: any, response: any) {
	response.json({ data: await storyAdsService.recordEvent(request.params.id, 'click', request.user?.id, request.body?.session_id) });
}