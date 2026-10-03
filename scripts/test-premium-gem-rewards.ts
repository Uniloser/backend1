import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPremiumGemReward } from '../src/services/premiumGemRewards';

test('monthly and yearly purchases and renewals award the configured gems', () => {
	for (const [plan, eventType, amount] of [
		['MONTHLY', 'INITIAL_PURCHASE', 50],
		['MONTHLY', 'RENEWAL', 50],
		['YEARLY', 'INITIAL_PURCHASE', 500],
		['YEARLY', 'RENEWAL', 500],
	] as const) {
		assert.equal(getPremiumGemReward({
			userId: 'user-1',
			plan,
			eventType,
			transactionId: `${plan}-${eventType}`,
		})?.amount, amount);
	}
});

test('lifetime awards gems once and rewards use transaction-id idempotency', () => {
	const initialReward = getPremiumGemReward({
		userId: 'user-1',
		plan: 'LIFETIME',
		eventType: 'INITIAL_PURCHASE',
		transactionId: 'lifetime-transaction',
	});
	assert.equal(initialReward?.amount, 1000);
	assert.equal(initialReward?.idempotencyKey, 'premium_gem_reward:user-1:lifetime-transaction');
	assert.equal(getPremiumGemReward({
		userId: 'user-1',
		plan: 'LIFETIME',
		eventType: 'RENEWAL',
		transactionId: 'lifetime-renewal',
	}), null);
});

test('non-purchase, non-renewal and unsupported plans do not award gems', () => {
	for (const [plan, eventType] of [
		['MONTHLY', 'CANCELLATION'],
		['YEARLY', 'BILLING_ISSUE'],
		['READAGORA_PLUS_WEEKLY', 'INITIAL_PURCHASE'],
	] as const) {
		assert.equal(getPremiumGemReward({
			userId: 'user-1',
			plan,
			eventType,
			transactionId: `${plan}-${eventType}`,
		}), null);
	}
});
