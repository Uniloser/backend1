import { getSupabaseAdmin } from '../config/supabase';

export type ActiveStoryAd = {
	id: string;
	presentation?: unknown;
	story: Record<string, unknown>;
} & Record<string, unknown>;

export type ReaderStoryAdImpression = { ad_id: string; created_at: string };

export async function listActiveAds(): Promise<ActiveStoryAd[]> {
	const now = new Date().toISOString();
	const pageSize = 200;
	const ads: ActiveStoryAd[] = [];
	let offset = 0;

	while (true) {
		const { data, error } = await getSupabaseAdmin()
			.from('story_ads')
			.select('*, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url, description, genre, tags)')
			.eq('is_active', true)
			.eq('status', 'active')
			.lte('starts_at', now)
			.or(`ends_at.is.null,ends_at.gte.${now}`)
			.eq('story.status', 'published')
			.order('created_at', { ascending: true })
			.order('id', { ascending: true })
			.range(offset, offset + pageSize - 1);

		if (error) throw error;
		const page: ActiveStoryAd[] = data ?? [];
		ads.push(...page);
		if (page.length < pageSize) break;
		offset += page.length;
	}

	return ads.filter(ad => ad.story);
}

export async function listReaderImpressions(
	adIds: string[],
	reader: { userId?: string; sessionId?: string },
): Promise<ReaderStoryAdImpression[]> {
	if (!adIds.length || (!reader.userId && !reader.sessionId)) return [];

	let query = getSupabaseAdmin()
		.from('story_ad_events')
		.select('ad_id, created_at')
		.eq('event_type', 'impression')
		.in('ad_id', adIds)
		.order('created_at', { ascending: false })
		.limit(2000);
	query = reader.userId
		? query.eq('user_id', reader.userId)
		: query.eq('session_id', reader.sessionId);

	const { data, error } = await query;
	if (error) throw error;
	const impressions: ReaderStoryAdImpression[] = data ?? [];
	return impressions;
}

export async function createEvent(input: {
	adId: string;
	eventType: 'impression' | 'click';
	userId?: string;
	sessionId?: string;
}) {
	const { error } = await getSupabaseAdmin().from('story_ad_events').insert({
		ad_id: input.adId,
		event_type: input.eventType,
		user_id: input.userId ?? null,
		session_id: input.sessionId ?? null,
	});

	if (error) throw error;
}
