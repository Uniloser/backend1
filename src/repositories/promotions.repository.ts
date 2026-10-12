import { getSupabaseAdmin } from '../config/supabase';

const promotionSelect = 'id, author_id, story_id, title, description, image_url, background_image_url, button_text, promotion_type, status, budget, spent, gem_cost, priority, starts_at, ends_at, is_active, duration_days, review_note, reward_gems_total, reward_gems_remaining, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url)';

export async function listByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin().from('story_ads').select(promotionSelect).eq('author_id', authorId).order('created_at', { ascending: false });
	if (error) throw error;
	const promotions = data ?? [];
	if (!promotions.length) return promotions;
	const { data: stats, error: statsError } = await getSupabaseAdmin().rpc('story_promotion_stats', { p_author_id: authorId });
	if (statsError) throw statsError;
	const byPromotion = new Map((stats ?? []).map((entry: any) => [entry.promotion_id, entry]));
	return promotions.map((promotion: any) => {
		const totals = byPromotion.get(promotion.id) as { impressions: number; clicks: number; rewards_awarded: number } | undefined;
		return { ...promotion, stats: { impressions: totals?.impressions ?? 0, clicks: totals?.clicks ?? 0, rewardsAwarded: totals?.rewards_awarded ?? 0 } };
	});
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
