import { getSupabaseAdmin } from '../config/supabase';

export type GemTransactionInput = {
	userId: string;
	amount: number;
	reason: string;
	referenceId?: string | null;
	idempotencyKey?: string | null;
	metadata?: Record<string, unknown>;
};

export async function getWallet(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('gem_wallets')
		.select('user_id, balance, created_at, updated_at')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) throw error;
	if (data) return data;

	const { data: created, error: createError } = await getSupabaseAdmin()
		.from('gem_wallets')
		.insert({ user_id: userId })
		.select('user_id, balance, created_at, updated_at')
		.single();

	if (createError) throw createError;
	return created;
}

export async function listTransactions(userId: string, limit = 50) {
	const { data, error } = await getSupabaseAdmin()
		.from('gem_transactions')
		.select('id, amount, reason, reference_id, metadata, created_at')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw error;
	return data ?? [];
}

export async function applyGemTransaction(input: GemTransactionInput) {
	const { data, error } = await getSupabaseAdmin().rpc('apply_gem_transaction', {
		p_user_id: input.userId,
		p_amount: input.amount,
		p_reason: input.reason,
		p_reference_id: input.referenceId ?? null,
		p_idempotency_key: input.idempotencyKey ?? null,
		p_metadata: input.metadata ?? {},
	});

	if (error) throw error;
	return data;
}

export async function listAchievements(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('achievements')
		.select('id, code, title, description, icon, gem_prize, user_achievements(unlocked_at)')
		.eq('user_achievements.user_id', userId)
		.order('created_at', { ascending: true });

	if (error) throw error;
	return (data ?? []).map((achievement: any) => ({
		...achievement,
		unlocked_at: achievement.user_achievements?.[0]?.unlocked_at ?? null,
		user_achievements: undefined,
	}));
}

export async function listActiveChallenges(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('challenges')
		.select('id, title, description, goal_type, goal_amount, gem_prize, starts_at, ends_at, user_challenge_progress(progress, completed_at)')
		.eq('user_challenge_progress.user_id', userId)
		.gte('ends_at', new Date().toISOString())
		.lte('starts_at', new Date().toISOString())
		.order('ends_at', { ascending: true });

	if (error) throw error;
	return (data ?? []).map((challenge: any) => ({
		...challenge,
		progress: challenge.user_challenge_progress?.[0]?.progress ?? 0,
		completed_at: challenge.user_challenge_progress?.[0]?.completed_at ?? null,
		user_challenge_progress: undefined,
	}));
}