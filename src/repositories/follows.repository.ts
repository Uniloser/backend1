import { getSupabaseAdmin } from '../config/supabase';

export async function follow(followerId: string, followedId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('follows')
		.upsert({ follower_id: followerId, followed_id: followedId }, { onConflict: 'follower_id,followed_id' })
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function unfollow(followerId: string, followedId: string) {
	const { error } = await getSupabaseAdmin()
		.from('follows')
		.delete()
		.eq('follower_id', followerId)
		.eq('followed_id', followedId);

	if (error) throw error;
}

export async function listFollowers(userId: string, limit: number, offset: number) {
	const { data, error } = await getSupabaseAdmin()
		.from('follows')
		.select('created_at, follower:users!follows_follower_id_fkey(id, username, display_name, avatar_url)')
		.eq('followed_id', userId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return data ?? [];
}

export async function listFollowing(userId: string, limit: number, offset: number) {
	const { data, error } = await getSupabaseAdmin()
		.from('follows')
		.select('created_at, followed:users!follows_followed_id_fkey(id, username, display_name, avatar_url)')
		.eq('follower_id', userId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return data ?? [];
}

export async function listFollowerIds(authorId: string, limit: number, offset: number) {
	const { data, error } = await getSupabaseAdmin()
		.from('follows')
		.select('follower_id')
		.eq('followed_id', authorId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return (data ?? []).map((row: { follower_id: string }) => row.follower_id);
}
// Follows-table repository stub.
// TODO: own follow upsert/delete and follower/following list queries.
