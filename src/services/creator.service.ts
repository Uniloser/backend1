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

export async function getCashWallet(userId: string) {
	const { data, error } = await db().from('creator_cash_accounts')
		.select('pending_usd_cents, available_usd_cents, reserved_usd_cents, lifetime_earned_usd_cents, lifetime_paid_usd_cents')
		.eq('writer_id', userId).maybeSingle();
	if (error) throw error;
	return data ?? { pending_usd_cents: 0, available_usd_cents: 0, reserved_usd_cents: 0, lifetime_earned_usd_cents: 0, lifetime_paid_usd_cents: 0 };
}

export async function getCashoutQuote(userId: string) {
	const { data, error } = await db().rpc('get_creator_cashout_quote', { p_writer_id: userId });
	if (error) throw error;
	return data;
}

export async function listCashTransactions(userId: string, limit: number) {
	const { data, error } = await db().from('creator_cash_journals')
		.select('id, kind, source_id, coins, eligible_net_usd_cents, creator_share_bps, creator_usd_cents, platform_usd_cents, created_at, metadata')
		.eq('writer_id', userId).order('created_at', { ascending: false }).limit(limit);
	if (error) throw error;
	return data ?? [];
}

export async function listPayoutHistory(userId: string, limit: number) {
	const { data, error } = await db().from('creator_payout_requests')
		.select('id, amount_usd_cents, amount_zmw_minor_units, fee_zmw_minor_units, exchange_rate_usd_zmw_micros, payout_method, status, reserve_state, payment_outcome, destination_hint, review_note, failure_note, approved_at, paid_at, created_at')
		.eq('writer_id', userId).order('created_at', { ascending: false }).limit(limit);
	if (error) throw error;
	return data ?? [];
}

const payoutErrors: Record<string, [number, string]> = {
	PAYOUT_IDEMPOTENCY_KEY_REQUIRED: [400, 'A request key is required. Please try again.'],
	INVALID_PAYOUT_AMOUNT: [400, 'Enter a valid payout amount.'],
	INVALID_PAYOUT_DESTINATION: [400, 'Enter valid payout destination details.'],
	PAYOUT_IDEMPOTENCY_MISMATCH: [409, 'This request key was already used for different payout details.'],
	PAYOUTS_DISABLED: [409, 'Withdrawals are not currently enabled. Your earnings remain in your creator account.'],
	PAYOUT_BELOW_MINIMUM: [400, 'The payout amount is below the current minimum.'],
	PAYOUT_METHOD_UNAVAILABLE: [400, 'That payout method is not currently supported.'],
	PAYOUT_FX_UNAVAILABLE: [409, 'The payout exchange rate is not configured.'],
	INSUFFICIENT_AVAILABLE_EARNINGS: [409, 'Available creator earnings are not enough for this payout.'],
	INVALID_PAYOUT_DECISION: [400, 'Choose approve or reject.'],
	PAYOUT_REVIEW_NOTE_REQUIRED: [400, 'Add a short review note.'],
	PAYOUT_NOT_FOUND: [404, 'Payout request not found.'],
	PAYOUT_SELF_APPROVAL_FORBIDDEN: [403, 'You cannot review your own payout request.'],
	PAYOUT_NOT_REVIEWABLE: [409, 'This payout request is no longer available for review.'],
	PAYOUT_ACCOUNT_RESERVATION_MISMATCH: [409, 'The creator account reservation needs reconciliation.'],
	PAYOUT_RESERVE_INSUFFICIENT: [409, 'The cash payout reserve is insufficient. The request remains approved and unpaid until reserve funds are available.'],
	INVALID_RESERVE_FUNDING_AMOUNT: [400, 'Enter a positive reserve funding amount.'],
	RESERVE_IDEMPOTENCY_KEY_REQUIRED: [400, 'A reserve funding request key is required.'],
	RESERVE_FUNDING_REFERENCE_REQUIRED: [400, 'Enter the funding reference.'],
	RESERVE_IDEMPOTENCY_MISMATCH: [409, 'This reserve request key was already used for different details.'],
	PAYOUT_NOT_READY_FOR_TRANSFER: [409, 'This payout is not approved with reserve funds held.'],
	INVALID_PAYOUT_OUTCOME: [400, 'Choose uncertain, paid, or failed.'],
	PAYOUT_RECONCILIATION_NOTE_REQUIRED: [400, 'Add a reconciliation note.'],
	PAYMENT_REFERENCE_REQUIRED: [400, 'Enter the confirmed transfer reference before marking the payout paid.'],
	PAYOUT_NOT_RECONCILABLE: [409, 'This payout cannot be reconciled from its current state.'],
	PAYOUT_RESERVE_HOLD_MISMATCH: [409, 'The cash reserve hold needs reconciliation.'],
};

async function callPayoutRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
	const { data, error } = await db().rpc(name, args);
	if (error) {
		const failure = payoutErrors[error.message];
		if (failure) throw new ApiError(failure[0], failure[1], { code: error.message });
		throw error;
	}
	return data as T;
}

export async function requestPayout(
	writerId: string,
	amountZmwMinorUnits: number,
	payoutMethod: string,
	destinationReference: string,
	idempotencyKey: string,
) {
	return callPayoutRpc('request_creator_payout', {
		p_writer_id: writerId,
		p_amount_zmw_minor_units: amountZmwMinorUnits,
		p_payout_method: payoutMethod,
		p_destination_reference: destinationReference,
		p_idempotency_key: idempotencyKey,
	});
}

export async function listAdminPayouts(limit: number) {
	const { data, error } = await db().from('creator_payout_requests')
		.select('id, writer_id, amount_usd_cents, amount_zmw_minor_units, fee_zmw_minor_units, exchange_rate_usd_zmw_micros, payout_method, destination_reference, destination_hint, status, reserve_state, payment_outcome, provider_reference, review_note, failure_note, reviewed_by, approved_at, paid_at, created_at, updated_at')
		.order('created_at', { ascending: true }).limit(limit);
	if (error) throw error;
	return data ?? [];
}

export async function getPayoutReserve() {
	const admin = db();
	const monthStart = new Date();
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);
	const [reserve, paid, movements] = await Promise.all([
		admin.from('creator_payout_reserve').select('currency, monthly_target_minor_units, available_minor_units, held_minor_units, updated_at').eq('singleton', true).single(),
		admin.from('creator_payout_reserve_movements').select('amount_zmw_minor_units').eq('kind', 'PAYOUT_PAID').gte('created_at', monthStart.toISOString()),
		admin.from('creator_payout_reserve_movements').select('id, kind, amount_zmw_minor_units, available_delta_minor_units, held_delta_minor_units, payout_request_id, reference, note, actor_id, created_at').order('created_at', { ascending: false }).limit(50),
	]);
	for (const result of [reserve, paid, movements]) if (result.error) throw result.error;
	return {
		...reserve.data,
		paidThisMonthMinorUnits: (paid.data ?? []).reduce((total: number, movement: { amount_zmw_minor_units: number }) => total + movement.amount_zmw_minor_units, 0),
		movements: movements.data ?? [],
	};
}

export async function reviewPayout(payoutRequestId: string, actorId: string, decision: 'approve' | 'reject', note: string) {
	return callPayoutRpc('review_creator_payout', {
		p_payout_request_id: payoutRequestId, p_actor_id: actorId, p_decision: decision, p_note: note,
	});
}

export async function fundPayoutReserve(actorId: string, amountZmwMinorUnits: number, reference: string, note: string, idempotencyKey: string) {
	return callPayoutRpc('fund_creator_payout_reserve', {
		p_actor_id: actorId,
		p_amount_zmw_minor_units: amountZmwMinorUnits,
		p_reference: reference,
		p_note: note,
		p_idempotency_key: idempotencyKey,
	});
}

export async function startPayoutTransfer(payoutRequestId: string, actorId: string) {
	return callPayoutRpc('start_creator_payout_transfer', {
		p_payout_request_id: payoutRequestId, p_actor_id: actorId,
	});
}

export async function reconcilePayout(
	payoutRequestId: string,
	actorId: string,
	outcome: 'uncertain' | 'paid' | 'failed',
	providerReference: string | null,
	note: string,
) {
	return callPayoutRpc('reconcile_creator_payout', {
		p_payout_request_id: payoutRequestId,
		p_actor_id: actorId,
		p_outcome: outcome,
		p_provider_reference: providerReference,
		p_note: note,
	});
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
