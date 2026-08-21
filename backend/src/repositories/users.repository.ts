import { getSupabaseAdmin } from '../config/supabase';

const profileFields = 'id, username, display_name, bio, avatar_url, created_at, updated_at';

export async function findByUsername(username: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('users')
		.select(profileFields)
		.eq('username', username)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function findById(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('users')
		.select(profileFields)
		.eq('id', userId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function updateById(userId: string, input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('users')
		.update(input)
		.eq('id', userId)
		.select(profileFields)
		.single();

	if (error) throw error;
	return data;
}

export async function listPublishedStories(authorId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select('*')
		.eq('author_id', authorId)
		.eq('status', 'published')
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function countFollowers(userId: string) {
	const { count, error } = await getSupabaseAdmin()
		.from('follows')
		.select('follower_id', { count: 'exact', head: true })
		.eq('followed_id', userId);

	if (error) throw error;
	return count ?? 0;
}
// Sole users-table repository stub.
// TODO: implement profile lookup by username/id, current-user lookup, profile
// update for bio/display_name/avatar_url, published-story summary, and
// follower/following counts. No other file may query public.users directly.
