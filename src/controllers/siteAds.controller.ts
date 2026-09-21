import * as siteAdsService from '../services/siteAds.service';

export async function getActiveAd(_request: any, response: any) {
	response.json({ data: await siteAdsService.getActiveAd() });
}
