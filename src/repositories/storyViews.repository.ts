import { getSupabaseAdmin } from '../config/supabase';

export async function createView(input: {
	story_id: string;
	user_id?: string | null;
	chapter_id?: string | null;
	session_id?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const { data, error } = await getSupabaseAdmin()
		.from('story_views')
		.insert({
			story_id: input.story_id,
			user_id: input.user_id ?? null,
			chapter_id: input.chapter_id ?? null,
			session_id: input.session_id ?? null,
			metadata: input.metadata ?? {},
		})
		.select('id, story_id, user_id, chapter_id, session_id, created_at')
		.single();

	if (error) throw error;
	return data;
}

export async function incrementStoryViewCount(storyId: string) {
	const { data: story, error: readError } = await getSupabaseAdmin()
		.from('stories')
		.select('view_count')
		.eq('id', storyId)
		.single();

	if (readError) throw readError;

	const nextCount = (story?.view_count ?? 0) + 1;
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.update({ view_count: nextCount })
		.eq('id', storyId)
		.select('id, view_count')
		.single();

	if (error) throw error;
	return data;
}
