import * as storyAdsRepository from '../repositories/storyAds.repository';
import { ApiError } from '../utils/ApiError';

export function getActiveAd() {
	return storyAdsRepository.findActiveAd();
}

export async function recordEvent(adId: string, eventType: 'impression' | 'click', userId?: string, sessionId?: string) {
	const ad = await storyAdsRepository.findActiveAd();
	if (!ad || ad.id !== adId) throw new ApiError(404, 'Story ad not found');

	await storyAdsRepository.createEvent({ adId, eventType, userId, sessionId });
	return { recorded: true };
}