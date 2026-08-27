import { getSupabaseAdmin } from '../config/supabase';

const promotionSelect = 'id, story_id, title, description, image_url, background_image_url, button_text, promotion_type, status, budget, spent, priority, starts_at, ends_at, is_active, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url)';

export async function listByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin().from('story_ads').select(promotionSelect).eq('story.author_id', authorId).order('created_at', { ascending: false });
	if (error) throw error;
	return data ?? [];
}

export async function create(input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin().from('story_ads').insert(input).select(promotionSelect).single();
	if (error) throw error;
	return data;
}