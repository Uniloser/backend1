import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectFairlyRotatedAd } from '../src/services/storyAdRotation';

const ads = [{ id: 'ad-1' }, { id: 'ad-2' }, { id: 'ad-3' }];

test('returns null when there are no active ads', () => {
	assert.equal(selectFairlyRotatedAd([], []), null);
});

test('selects the only active ad', () => {
	assert.equal(selectFairlyRotatedAd([ads[0]], [])?.id, 'ad-1');
});

test('randomly selects among unseen ads before repeating any seen ad', () => {
	const selected = selectFairlyRotatedAd(
		ads,
		[{ ad_id: 'ad-1', created_at: '2025-01-01T00:00:00.000Z' }],
		() => 0.99,
	);
	assert.equal(selected?.id, 'ad-3');
});

test('repeats the least recently seen ad, randomly breaking timestamp ties', () => {
	const selected = selectFairlyRotatedAd(
		ads,
		[
			{ ad_id: 'ad-1', created_at: '2025-01-01T00:00:00.000Z' },
			{ ad_id: 'ad-2', created_at: '2025-01-03T00:00:00.000Z' },
			{ ad_id: 'ad-3', created_at: '2025-01-01T00:00:00.000Z' },
		],
		() => 0.99,
	);
	assert.equal(selected?.id, 'ad-3');
});

test('uses the newest impression when history is unordered', () => {
	const selected = selectFairlyRotatedAd(
		ads.slice(0, 2),
		[
			{ ad_id: 'ad-1', created_at: '2025-01-04T00:00:00.000Z' },
			{ ad_id: 'ad-2', created_at: '2025-01-03T00:00:00.000Z' },
			{ ad_id: 'ad-1', created_at: '2025-01-01T00:00:00.000Z' },
		],
		() => 0,
	);
	assert.equal(selected?.id, 'ad-2');
});
