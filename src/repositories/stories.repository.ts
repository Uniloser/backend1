import { getSupabaseAdmin } from '../config/supabase';

const storySelect = '*, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)';

export async function findStory(storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select(storySelect)
		.eq('id', storyId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function createStory(input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.insert(input)
		.select(storySelect)
		.single();

	if (error) throw error;
	return data;
}

export async function updateStory(storyId: string, input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.update(input)
		.eq('id', storyId)
		.select(storySelect)
		.single();

	if (error) throw error;
	return data;
}

export async function deleteStory(storyId: string) {
	const { error } = await getSupabaseAdmin()
		.from('stories')
		.delete()
		.eq('id', storyId);

	if (error) throw error;
}

export async function countChapters(storyId: string) {
	const { count, error } = await getSupabaseAdmin()
		.from('chapters')
		.select('id', { count: 'exact', head: true })
		.eq('story_id', storyId);

	if (error) throw error;
	return count ?? 0;
}

export async function listPublishedStoriesByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select(storySelect)
		.eq('author_id', authorId)
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function listStoriesByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select(storySelect)
		.eq('author_id', authorId)
		.order('updated_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function listRecommendations(storyId: string, genreId?: string | null, limit = 8) {
	let query = getSupabaseAdmin()
		.from('stories')
		.select(storySelect)
		.eq('status', 'published')
		.neq('id', storyId);

	if (genreId) {
		query = query.eq('genre_id', genreId);
	}

	const { data, error } = await query
		.order('view_count', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data ?? [];
}

export async function listPopularPublishedExcluding(excludeIds: string[], limit = 8) {
	if (limit <= 0) return [];
	let query = getSupabaseAdmin()
		.from('stories')
		.select(storySelect)
		.eq('status', 'published');

	if (excludeIds.length > 0) {
		query = query.not('id', 'in', `(${excludeIds.join(',')})`);
	}

	const { data, error } = await query
		.order('view_count', { ascending: false })
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data ?? [];
}
