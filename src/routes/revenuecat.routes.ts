import { timingSafeEqual } from 'node:crypto';
import express from 'express';

import { env } from '../config/env';
import { getSupabaseAdmin } from '../config/supabase';
import * as walletService from '../services/wallet.service';
import { getPremiumGemReward } from '../services/premiumGemRewards';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const entitlementId = 'readagora_premium';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameSecret(received: string, expected: string) {
	const receivedBytes = Buffer.from(received);
	const expectedBytes = Buffer.from(expected);
	return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

function mapPlan(productId: string) {
	const product = productId.toLowerCase();
	if (product.includes('lifetime')) return 'LIFETIME';
	if (product.includes('year')) return 'YEARLY';
	if (product.includes('month')) return 'MONTHLY';
	return 'READAGORA_PLUS_WEEKLY';
}

router.post('/webhooks/revenuecat', asyncHandler(async (request: any, response: any) => {
	if (!env.revenueCatWebhookAuthToken) {
		response.status(503).json({ error: 'RevenueCat webhook is not configured.' });
		return;
	}
	const authorization = String(request.headers.authorization ?? '');
	if (!sameSecret(authorization, env.revenueCatWebhookAuthToken)) {
		response.status(401).json({ error: 'Unauthorized.' });
		return;
	}

	const event = request.body?.event;
	if (!event || typeof event !== 'object') {
		response.status(400).json({ error: 'Missing RevenueCat event.' });
		return;
	}
	const appUserId = String(event.app_user_id ?? '');
	const productId = String(event.product_id ?? '');
	const providerTransactionId = String(event.original_transaction_id ?? event.transaction_id ?? event.id ?? '');
	const eventTimestamp = Number(event.event_timestamp_ms);
	const eventType = String(event.type ?? '').toUpperCase();
	const entitlementIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : [];
	if (!uuidPattern.test(appUserId) || !productId || !providerTransactionId || !Number.isFinite(eventTimestamp)) {
		response.status(400).json({ error: 'Invalid RevenueCat event fields.' });
		return;
	}
	const supabase = getSupabaseAdmin();
	const { data: coinProduct, error: coinProductError } = await supabase.from('coin_products')
		.select('product_id').eq('product_id', productId).eq('enabled', true).maybeSingle();
	if (coinProductError && !String(coinProductError.message ?? '').includes('coin_products')) throw coinProductError;
	if (coinProduct && ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'].includes(eventType)) {
		const transactionId = String(event.transaction_id ?? event.id ?? '');
		if (!transactionId) {
			response.status(400).json({ error: 'Coin purchase event is missing its transaction id.' });
			return;
		}
		const { error: grantError } = await supabase.rpc('grant_coin_purchase', {
			p_user_id: appUserId,
			p_product_id: productId,
			p_provider_transaction_id: transactionId,
			p_metadata: { event_type: eventType, event_id: String(event.id ?? '') },
		});
		if (grantError) throw grantError;
		response.status(200).json({ received: true, coinPurchase: true });
		return;
	}
	if (!entitlementIds.includes(entitlementId)) {
		response.status(200).json({ received: true, ignored: true });
		return;
	}

	const { data: prior, error: lookupError } = await supabase.from('subscriptions')
		.select('id, provider_event_timestamp_ms')
		.eq('provider', 'revenuecat')
		.eq('provider_subscription_id', providerTransactionId)
		.maybeSingle();
	if (lookupError) throw lookupError;
	if (prior && Number(prior.provider_event_timestamp_ms ?? 0) >= eventTimestamp) {
		response.status(200).json({ received: true, duplicate: true });
		return;
	}

	const expirationMs = event.expiration_at_ms == null ? null : Number(event.expiration_at_ms);
	const hasNotExpired = expirationMs == null || (Number.isFinite(expirationMs) && expirationMs > Date.now());
	const endedEvent = ['EXPIRATION', 'REFUND'].includes(eventType);
	const billingIssue = eventType === 'BILLING_ISSUE';
	const status = endedEvent || !hasNotExpired ? 'EXPIRED' : billingIssue ? 'GRACE_PERIOD' : 'ACTIVE';
	const eventDate = (milliseconds: unknown) => {
		const value = milliseconds == null ? null : Number(milliseconds);
		return value != null && Number.isFinite(value) ? new Date(value).toISOString() : null;
	};
	const record = {
		user_id: appUserId,
		provider: 'revenuecat',
		provider_subscription_id: providerTransactionId,
		provider_event_timestamp_ms: eventTimestamp,
		plan: mapPlan(productId),
		status,
		started_at: eventDate(event.purchased_at_ms),
		current_period_start: eventDate(event.purchased_at_ms),
		current_period_end: eventDate(event.expiration_at_ms),
		cancel_at_period_end: eventType === 'CANCELLATION' && status === 'ACTIVE',
		cancelled_at: eventType === 'CANCELLATION' ? new Date(eventTimestamp).toISOString() : null,
		updated_at: new Date().toISOString(),
	};
	const gemReward = status === 'ACTIVE' ? getPremiumGemReward({
		userId: appUserId,
		plan: mapPlan(productId),
		eventType,
		transactionId: String(event.transaction_id ?? event.id ?? providerTransactionId),
	}) : null;
	if (gemReward) await walletService.awardGems({ userId: appUserId, ...gemReward });
	const { error: upsertError } = await supabase.from('subscriptions').upsert(record, { onConflict: 'provider,provider_subscription_id' });
	if (upsertError) throw upsertError;
	response.status(200).json({ received: true });
}));

export default router;
