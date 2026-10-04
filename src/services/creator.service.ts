import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

const db = () => getSupabaseAdmin();

export async function applyForMonetization(userId: string) {
	const client = db();
	const { data: profile, error } = await client.from('creator_monetization_profiles').select('status').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	if (profile?.status === 'PENDING') return { status: 'PENDING' };
	if (profile?.status !== 'ELIGIBLE') throw new ApiError(403, 'Your account is not currently eligible to apply for creator monetization.');
	const { data, error: updateError } = await client.from('creator_monetization_profiles').update({ status: 'PENDING', updated_at: new Date().toISOString() }).eq('user_id', userId).eq('status', 'ELIGIBLE').select('status').single();
	if (updateError) throw updateError;
	return data;
}

export async function getWallet(userId: string) {
	const client = db();
	const { data, error } = await client.from('creator_wallets').select('pending_balance, available_balance, lifetime_earnings, lifetime_paid, currency').eq('writer_id', userId).maybeSingle();
	if (error) throw error;
	return data ?? { pending_balance: 0, available_balance: 0, lifetime_earnings: 0, lifetime_paid: 0, currency: 'ZAR' };
}

export async function listTransactions(userId: string, limit: number) {
	const { data, error } = await db().from('creator_earnings_ledger').select('id, source_type, amount, currency, status, description, created_at').eq('writer_id', userId).order('created_at', { ascending: false }).limit(limit);
	if (error) throw error;
	return data ?? [];
}

export async function getAnalytics(userId: string) {
	const client = db();
	const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
	const [qualified, support, earnings, coins] = await Promise.all([
		client.from('reading_engagement_events').select('reader_id, premium_reader, reading_duration_seconds').eq('writer_id', userId).eq('qualification_status', 'QUALIFIED'),
		client.from('coin_support_events').select('coins').eq('writer_id', userId).gte('created_at', start.toISOString()),
		client.from('creator_earnings_ledger').select('source_type, amount').eq('writer_id', userId).gte('created_at', start.toISOString()).in('status', ['PENDING', 'AVAILABLE', 'PAID']),
		client.from('reading_engagement_events').select('id', { count: 'exact', head: true }).eq('writer_id', userId).eq('qualification_status', 'QUALIFIED'),
	]);
	for (const result of [qualified, support, earnings, coins]) if (result.error) throw result.error;
	const events = qualified.data ?? [];
	const readers = new Set(events.map((event: any) => event.reader_id));
	const premiumReaders = new Set(events.filter((event: any) => event.premium_reader).map((event: any) => event.reader_id));
	const month = { creator_pool: 0, coin_support: 0, bonuses: 0, originals: 0 };
	for (const item of earnings.data ?? []) {
		const value = Number(item.amount) || 0;
		if (item.source_type === 'CREATOR_POOL') month.creator_pool += value;
		if (item.source_type === 'COIN_SUPPORT') month.coin_support += value;
		if (item.source_type === 'BONUS') month.bonuses += value;
		if (item.source_type === 'ORIGINAL_ADVANCE' || item.source_type === 'ORIGINAL_REVENUE_SHARE') month.originals += value;
	}
	return { qualified_readers: readers.size, premium_readers: premiumReaders.size, qualified_reading_hours: events.reduce((sum: number, event: any) => sum + (Number(event.reading_duration_seconds) || 0), 0) / 3600, qualified_chapter_reads: coins.count ?? 0, coins_received: (support.data ?? []).reduce((sum: number, event: any) => sum + (Number(event.coins) || 0), 0), current_month: month };
}
