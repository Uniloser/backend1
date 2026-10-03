import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promotionGemCosts } from '../src/services/promotions.service';
import { createPromotionSchema } from '../src/validators/promotions.validator';

const requestKey = '00000000-0000-4000-8000-000000000000';
const storyId = '00000000-0000-4000-8000-000000000001';

test('promotion requests accept only supported gem package durations', () => {
	for (const duration of [1, 3, 7, 14]) {
		assert.equal(createPromotionSchema.safeParse({
			story_id: storyId,
			promotion_type: 'boost',
			duration_days: duration,
			request_key: requestKey,
		}).success, true);
	}

	for (const duration of [0, 2, 30]) {
		assert.equal(createPromotionSchema.safeParse({
			story_id: storyId,
			promotion_type: 'boost',
			duration_days: duration,
			request_key: requestKey,
		}).success, false);
	}
});

test('promotion requests require an idempotency key and valid promotion type', () => {
	assert.equal(createPromotionSchema.safeParse({
		story_id: storyId,
		promotion_type: 'boost',
		duration_days: 1,
	}).success, false);

	assert.equal(createPromotionSchema.safeParse({
		story_id: storyId,
		promotion_type: 'unsupported',
		duration_days: 1,
		request_key: requestKey,
	}).success, false);
});

test('the package price map matches the fixed promotion durations', () => {
	assert.deepEqual(promotionGemCosts, {
		1: 5,
		3: 10,
		7: 20,
		14: 40,
	});
});
