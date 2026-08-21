import { getSupabaseAdmin } from '../config/supabase';

export async function blockUser(blockerId: string, blockedId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('user_blocks')
		.upsert(
			{ blocker_id: blockerId, blocked_id: blockedId },
			{ onConflict: 'blocker_id,blocked_id' },
		)
		.select('blocker_id, blocked_id, created_at')
		.single();

	if (error) throw error;
	return data;
}

export async function unblockUser(blockerId: string, blockedId: string) {
	const { error } = await getSupabaseAdmin()
		.from('user_blocks')
		.delete()
		.eq('blocker_id', blockerId)
		.eq('blocked_id', blockedId);

	if (error) throw error;
}

export async function listBlocked(blockerId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('user_blocks')
		.select(
			'blocked_id, created_at, blocked:users!user_blocks_blocked_id_fkey(id, username, display_name, avatar_url)',
		)
		.eq('blocker_id', blockerId)
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function isBlocked(blockerId: string, blockedId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('user_blocks')
		.select('blocked_id')
		.eq('blocker_id', blockerId)
		.eq('blocked_id', blockedId)
		.maybeSingle();

	if (error) throw error;
	return Boolean(data);
}
