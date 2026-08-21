import { getSupabaseAdmin } from '../config/supabase';

const bookmarkSelect =
	'id, user_id, story_id, chapter_id, note, created_at, updated_at, story:stories!bookmarks_story_id_fkey(*)';

export async function listByUser(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('bookmarks')
		.select(bookmarkSelect)
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function upsertStoryLevel(
	userId: string,
	input: { story_id: string; chapter_id?: string | null; note?: string | null },
) {
	await getSupabaseAdmin()
		.from('bookmarks')
		.delete()
		.eq('user_id', userId)
		.eq('story_id', input.story_id);

	const { data, error } = await getSupabaseAdmin()
		.from('bookmarks')
		.insert({
			user_id: userId,
			story_id: input.story_id,
			chapter_id: input.chapter_id ?? null,
			note: input.note ?? null,
		})
		.select(bookmarkSelect)
		.single();

	if (error) throw error;
	return data;
}

export async function deleteById(bookmarkId: string, userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('bookmarks')
		.delete()
		.eq('id', bookmarkId)
		.eq('user_id', userId)
		.select('id')
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function deleteByStory(userId: string, storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('bookmarks')
		.delete()
		.eq('user_id', userId)
		.eq('story_id', storyId)
		.select('id');

	if (error) throw error;
	return data ?? [];
}
