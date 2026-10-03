import * as storyAdsRepository from '../repositories/storyAds.repository';
import { ApiError } from '../utils/ApiError';
import { promotionCreativeSchema } from '../validators/promotionCreative';
import { selectFairlyRotatedAd } from './storyAdRotation';

export async function getActiveAd(reader: { userId?: string; sessionId?: string }) {
	if (reader.sessionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reader.sessionId)) {
		throw new ApiError(400, 'Invalid reader session.');
	}
	const activeAds = await storyAdsRepository.listActiveAds();
	const impressions = await storyAdsRepository.listReaderImpressions(activeAds.map(ad => ad.id), reader);
	const ad = selectFairlyRotatedAd(activeAds, impressions);
	if (!ad) return null;
	const parsed = promotionCreativeSchema.safeParse(ad.presentation ?? {});
	return { ...ad, presentation: parsed.success ? parsed.data : {} };
}

export async function recordEvent(adId: string, eventType: 'impression' | 'click', userId?: string, sessionId?: string) {
	if (sessionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
		throw new ApiError(400, 'Invalid reader session.');
	}
	const activeAds = await storyAdsRepository.listActiveAds();
	if (!activeAds.some(ad => ad.id === adId)) throw new ApiError(404, 'Story ad not found');

	await storyAdsRepository.createEvent({ adId, eventType, userId, sessionId });
	return { recorded: true };
}
