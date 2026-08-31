import { getSupabaseAdmin } from '../config/supabase';

export async function findActiveAd() {
	const { data, error } = await getSupabaseAdmin()
		.from('story_ads')
		.select('id, story_id, title, description, image_url, background_image_url, button_text, priority, story:stories!story_ads_story_id_fkey(id, title, status)')
		.eq('is_active', true)
		.lte('starts_at', new Date().toISOString())
		.or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
		.eq('story.status', 'published')
		.order('priority', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) throw error;
	if (!data || !data.story) return null;
	return data;
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