import * as siteAdsRepository from '../repositories/siteAds.repository';
import { promotionCreativeSchema } from '../validators/promotionCreative';

export async function getActiveAd() {
	const ad = await siteAdsRepository.findActiveAd();
	if (!ad) return null;
	const presentation = promotionCreativeSchema.safeParse(ad.presentation ?? {});
	return { ...ad, presentation: presentation.success ? presentation.data : {} };
}
