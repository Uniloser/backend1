import { getSupabaseAdmin } from '../config/supabase';

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
