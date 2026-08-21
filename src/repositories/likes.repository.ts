import { getSupabaseAdmin } from '../config/supabase';

export async function addLike(userId: string, storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('likes')
		.upsert({ user_id: userId, story_id: storyId }, { onConflict: 'user_id,story_id' })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function removeLike(userId: string, storyId: string) {
	const { error } = await getSupabaseAdmin()
		.from('likes')
		.delete()
		.eq('user_id', userId)
		.eq('story_id', storyId);

	if (error) throw error;
}
// Likes-table repository stub.
// TODO: own idempotent story like insert/delete and viewer like-state lookup;
// coordinate optional stories.like_count updates transactionally where needed.
