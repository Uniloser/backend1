import { getSupabaseAdmin } from '../config/supabase';

export type UpsertPushTokenInput = {
	userId: string;
	token: string;
	platform: 'ios' | 'android' | 'web';
};

export async function upsert(input: UpsertPushTokenInput) {
	const { data, error } = await getSupabaseAdmin()
		.from('push_tokens')
		.upsert(
			{
				user_id: input.userId,
				token: input.token,
				platform: input.platform,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id,token' },
		)
		.select('id, token, platform')
		.single();

	if (error) throw error;
	return data;
}

export async function remove(userId: string, token: string) {
	const { error } = await getSupabaseAdmin()
		.from('push_tokens')
		.delete()
		.eq('user_id', userId)
		.eq('token', token);

	if (error) throw error;
}

export async function listForUser(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('push_tokens')
		.select('token')
		.eq('user_id', userId);

	if (error) throw error;
	return (data ?? []) as Array<{ token: string }>;
}