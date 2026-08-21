import { getSupabaseAdmin } from '../config/supabase';

export async function findStory(storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select('*')
		.eq('id', storyId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function createStory(input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.insert(input)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updateStory(storyId: string, input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.update(input)
		.eq('id', storyId)
		.select()
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
		.select('*')
		.eq('author_id', authorId)
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function listStoriesByAuthor(authorId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select('*')
		.eq('author_id', authorId)
		.order('updated_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}
// Stories-table repository stub.
// TODO: implement story CRUD, published author listing, chapter-count lookup,
// status/ownership queries, like upsert/delete, and denormalized like-count
// increment/decrement where that optimization is enabled.
