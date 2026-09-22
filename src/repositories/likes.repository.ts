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

export async function addChapterLike(userId: string, chapterId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapter_likes')
		.upsert({ user_id: userId, chapter_id: chapterId }, { onConflict: 'user_id,chapter_id' })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function removeChapterLike(userId: string, chapterId: string) {
	const { error } = await getSupabaseAdmin()
		.from('chapter_likes')
		.delete()
		.eq('user_id', userId)
		.eq('chapter_id', chapterId);

	if (error) throw error;
}

export async function getChapterLikeState(chapterId: string, userId?: string) {
	const db = getSupabaseAdmin();
	const [{ count, error: countError }, likedResult] = await Promise.all([
		db.from('chapter_likes').select('user_id', { count: 'exact', head: true }).eq('chapter_id', chapterId),
		userId
			? db.from('chapter_likes').select('user_id').eq('chapter_id', chapterId).eq('user_id', userId).maybeSingle()
			: Promise.resolve({ data: null, error: null }),
	]);

	if (countError) throw countError;
	if (likedResult.error) throw likedResult.error;
	return { liked: Boolean(likedResult.data), count: count ?? 0 };
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
