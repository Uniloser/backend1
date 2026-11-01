import * as siteAdsRepository from '../repositories/siteAds.repository';
import { promotionCreativeSchema } from '../validators/promotionCreative';

export async function getActiveAd() {
	const ad = await siteAdsRepository.findActiveAd();
	if (!ad) return null;
	const presentation = promotionCreativeSchema.safeParse(ad.presentation ?? {});
	if (!presentation.success) throw new Error(`Invalid presentation for site ad ${ad.id}: ${presentation.error.issues.map(issue => `${issue.path.join('.') || 'presentation'}: ${issue.message}`).join('; ')}`);
	return { ...ad, presentation: presentation.data };
}

export async function getActiveAds() {
 const ads = await siteAdsRepository.findActiveAds();
 return ads.map(ad => {
  const presentation = promotionCreativeSchema.safeParse(ad.presentation ?? {});
  if (!presentation.success) throw new Error(`Invalid presentation for site ad ${ad.id}: ${presentation.error.issues.map(issue => `${issue.path.join('.') || 'presentation'}: ${issue.message}`).join('; ')}`);
  return { ...ad, presentation: presentation.data };
 });
}
