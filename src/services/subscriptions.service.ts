import { getSupabaseAdmin } from '../config/supabase';

export async function getCurrentSubscription(userId: string) {
	const now = new Date().toISOString();
	const { data, error } = await getSupabaseAdmin()
		.from('subscriptions')
		.select('plan, status, current_period_start, current_period_end, cancel_at_period_end, updated_at')
		.eq('user_id', userId)
		.in('status', ['ACTIVE', 'GRACE_PERIOD'])
		.or(`current_period_end.is.null,current_period_end.gt.${now}`)
		.order('current_period_end', { ascending: false, nullsFirst: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return data ?? null;
}
