export type StoryAdCandidate = { id: string; promotion_type?: 'boost' | 'featured' | 'reward' };
export type StoryAdImpression = { ad_id: string; created_at: string };

export function selectFairlyRotatedAd<T extends StoryAdCandidate>(
	ads: T[],
	impressions: StoryAdImpression[],
	random: () => number = Math.random,
): T | null {
	if (ads.length === 0) return null;
	const weighted = (candidates: T[]) => {
		const weight = (ad: T) => {
			const typeWeight = ad.promotion_type === 'featured' ? 6 : ad.promotion_type === 'boost' ? 3 : 1;
			const priority = Math.max(-100, Math.min(100, Number((ad as T & { priority?: number }).priority ?? 0)));
			return typeWeight * (1 + priority / 200);
		};
		const total = candidates.reduce((sum, ad) => sum + weight(ad), 0);
		let point = Math.max(0, Math.min(0.999999999, random())) * total;
		for (const ad of candidates) {
			point -= weight(ad);
			if (point < 0) return ad;
		}
		return candidates[candidates.length - 1];
	};

	const lastSeen = new Map<string, number>();
	for (const impression of impressions) {
		const timestamp = Date.parse(impression.created_at);
		const previous = lastSeen.get(impression.ad_id);
		if (Number.isFinite(timestamp) && (previous === undefined || timestamp > previous)) {
			lastSeen.set(impression.ad_id, timestamp);
		}
	}

	const unseen = ads.filter(ad => !lastSeen.has(ad.id));
	if (unseen.length) return weighted(unseen);

	const oldestTimestamp = Math.min(...ads.map(ad => lastSeen.get(ad.id) ?? 0));
	const oldestSeen = ads.filter(ad => (lastSeen.get(ad.id) ?? 0) === oldestTimestamp);
	return weighted(oldestSeen);
}
