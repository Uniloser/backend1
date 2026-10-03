import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStorySchema, updateStorySchema } from '../src/validators/stories.schema';

test('story creation accepts the supported disclosure options', () => {
	const result = createStorySchema.safeParse({
		title: 'A disclosed story',
		genre: 'Fantasy',
		is_ai_assisted: true,
		is_ai_generated: false,
		content_warnings: ['graphic_violence', 'profanity', 'sensitive_content', 'sexual_content'],
	});

	assert.equal(result.success, true);
});

test('story disclosure validation rejects unknown, duplicate, and malformed values', () => {
	for (const contentWarnings of [
		['unlisted_warning'],
		['profanity', 'profanity'],
		['graphic_violence', 'profanity', 'sensitive_content', 'sexual_content', 'extra'],
	]) {
		assert.equal(updateStorySchema.safeParse({ content_warnings: contentWarnings }).success, false);
	}

	assert.equal(updateStorySchema.safeParse({ is_ai_assisted: 'yes' }).success, false);
});
