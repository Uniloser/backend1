import { getSupabaseAdmin } from '../config/supabase';

export async function findChapterInStory(storyId: string, chapterId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.select('id, story_id')
		.eq('id', chapterId)
		.eq('story_id', storyId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function upsertProgress(userId: string, storyId: string, lastChapterId: string | null) {
	const { data, error } = await getSupabaseAdmin()
		.from('reading_progress')
		.upsert({
			user_id: userId,
			story_id: storyId,
			last_chapter_id: lastChapterId,
			updated_at: new Date().toISOString(),
		}, { onConflict: 'user_id,story_id' })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function listLibrary(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('reading_progress')
		.select('story_id, last_chapter_id, updated_at, story:stories!reading_progress_story_id_fkey(*)')
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}
// Reading-progress repository stub.
// TODO: own progress upsert and private user library reads, including resume
// chapter and bookmarked-story data when bookmarks are added to the schema.
