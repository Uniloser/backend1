import * as storiesRepository from '../repositories/stories.repository';
import { ApiError } from '../utils/ApiError';
import type { CreateStoryInput, UpdateStoryInput } from '../validators/stories.schema';

async function requireStory(storyId: string) {
	const story = await storiesRepository.findStory(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	return story;
}

async function requireAuthor(storyId: string, userId: string) {
	const story = await requireStory(storyId);

	if (story.author_id !== userId) {
		throw new ApiError(403, 'Only the story author can manage this story');
	}

	return story;
}

export async function createStory(authorId: string, input: CreateStoryInput) {
	return storiesRepository.createStory({
		...input,
		author_id: authorId,
		tags: input.tags ?? [],
		status: 'draft',
	});
}

export async function getStory(storyId: string, userId?: string) {
	const story = await requireStory(storyId);

	if (story.status === 'draft' && story.author_id !== userId) {
		throw new ApiError(404, 'Story not found');
	}

	return story;
}

export async function updateStory(storyId: string, userId: string, input: UpdateStoryInput) {
	const story = await requireAuthor(storyId, userId);
	const update: Record<string, unknown> = { ...input };

	if (input.status === 'published' && story.status !== 'published') {
		const chapterCount = await storiesRepository.countChapters(storyId);

		if (chapterCount === 0) {
			throw new ApiError(400, 'A story must have at least one chapter before publishing');
		}
	}

	return storiesRepository.updateStory(storyId, update);
}

export async function deleteStory(storyId: string, userId: string) {
	await requireAuthor(storyId, userId);
	await storiesRepository.deleteStory(storyId);
}

export async function listPublishedStoriesByAuthor(authorId: string) {
	return storiesRepository.listPublishedStoriesByAuthor(authorId);
}
// Story business-logic stub.
// TODO: enforce author ownership and defense-in-depth draft visibility.
// TODO: prevent publishing a story with zero chapters; coordinate metadata
// updates, delete policy, and like toggle behavior with repositories.
