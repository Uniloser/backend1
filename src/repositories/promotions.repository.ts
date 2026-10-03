import { getSupabaseAdmin } from '../config/supabase';

const promotionSelect = 'id, author_id, story_id, title, description, image_url, background_image_url, button_text, promotion_type, status, budget, spent, gem_cost, priority, starts_at, ends_at, is_active, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url)';

export async function listByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin().from('story_ads').select(promotionSelect).eq('author_id', authorId).order('created_at', { ascending: false });
	if (error) throw error;
	return data ?? [];
}

export async function createWithGems(input: {
	userId: string;
	storyId: string;
	promotionType: 'boost' | 'featured' | 'reward';
	durationDays: number;
	requestKey: string;
}) {
	const { data, error } = await getSupabaseAdmin().rpc('create_story_promotion_with_gems', {
		p_user_id: input.userId,
		p_story_id: input.storyId,
		p_promotion_type: input.promotionType,
		p_duration_days: input.durationDays,
		p_request_key: input.requestKey,
	});
	if (error) throw error;
	return data;
}