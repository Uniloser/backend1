import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import * as notificationsService from './notifications.service';
import * as usersRepository from '../repositories/users.repository';

export async function getWallet(userId: string) {
	const { data, error } = await getSupabaseAdmin().from('coin_wallets').select('balance, lifetime_purchased, lifetime_spent').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return data ?? { balance: 0, lifetime_purchased: 0, lifetime_spent: 0 };
}

export async function listProducts() {
	const { data, error } = await getSupabaseAdmin().from('coin_products').select('product_id, coins, display_name, enabled').eq('enabled', true).order('coins', { ascending: true });
	if (error) throw error;
	return (data ?? []).map((product: any) => ({ ...product, available: false }));
}

export async function listHistory(userId: string, limit: number) {
	const { data, error } = await getSupabaseAdmin().from('coin_transactions').select('id, type, amount, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
	if (error) throw error;
	return data ?? [];
}

export async function sendSupport(readerId: string, storyId: string, coins: number) {
	const { data, error } = await getSupabaseAdmin().rpc('send_coin_support', {
		p_reader_id: readerId, p_story_id: storyId, p_coins: coins,
	});
	if (error) {
		const failures: Record<string, [number, string]> = {
			INVALID_SUPPORT_AMOUNT: [400, 'Choose a support amount from 1 to 800 coins.'],
			STORY_NOT_FOUND: [404, 'This story is no longer available for support.'],
			SELF_SUPPORT_NOT_ALLOWED: [400, 'You cannot send coins to your own story.'],
			INSUFFICIENT_COINS: [409, 'You do not have enough Agora Coins.'],
		};
		const failure = failures[error.message];
		if (failure) throw new ApiError(failure[0], failure[1], { code: error.message });
		throw error;
	}
	const result = data as { supportId: string; coins: number; balance: number; writerId: string; storyTitle: string };
	void usersRepository.findById(readerId)
		.then(actor => notificationsService.notifyCoinSupport(result.writerId, readerId, storyId, result.storyTitle, coins, actor?.display_name ?? actor?.username ?? undefined))
		.catch(error => console.error('coin_support notification failed', error));
	return result;
}
