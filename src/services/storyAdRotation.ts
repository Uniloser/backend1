export type StoryAdCandidate = { id: string };
export type StoryAdImpression = { ad_id: string; created_at: string };

export function selectFairlyRotatedAd<T extends StoryAdCandidate>(
	ads: T[],
	impressions: StoryAdImpression[],
	random: () => number = Math.random,
): T | null {
	if (ads.length === 0) return null;

	const lastSeen = new Map<string, number>();
	for (const impression of impressions) {
		const timestamp = Date.parse(impression.created_at);
		const previous = lastSeen.get(impression.ad_id);
		if (Number.isFinite(timestamp) && (previous === undefined || timestamp > previous)) {
			lastSeen.set(impression.ad_id, timestamp);
		}
	}

	const unseen = ads.filter(ad => !lastSeen.has(ad.id));
	if (unseen.length) return unseen[Math.floor(random() * unseen.length)];

	const oldestTimestamp = Math.min(...ads.map(ad => lastSeen.get(ad.id) ?? 0));
	const oldestSeen = ads.filter(ad => (lastSeen.get(ad.id) ?? 0) === oldestTimestamp);
	return oldestSeen[Math.floor(random() * oldestSeen.length)];
}
