import * as storiesRepository from '../repositories/stories.repository';
import * as followsRepository from '../repositories/follows.repository';
import { enqueueNotifyFollowers } from '../jobs/notifyFollowers.job';
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
		content_type: input.content_type ?? 'text',
		status: 'draft',
	});
}

export async function getStory(storyId: string, userId?: string) {
	const story = await requireStory(storyId);

	if (story.status === 'draft' && story.author_id !== userId) {
		throw new ApiError(404, 'Story not found');
	}

	const viewerFollowsAuthor = userId && userId !== story.author_id
		? await followsRepository.isFollowing(userId, story.author_id)
		: false;

	return { ...story, viewer_follows_author: viewerFollowsAuthor };
}

export async function updateStory(storyId: string, userId: string, input: UpdateStoryInput) {
	const story = await requireAuthor(storyId, userId);
	const update: Record<string, unknown> = { ...input };
	const publishing = input.status === 'published' && story.status !== 'published';

	if (publishing) {
		const chapterCount = await storiesRepository.countChapters(storyId);

		if (chapterCount === 0) {
			throw new ApiError(400, 'A story must have at least one chapter before publishing');
		}
	}

	const updated = await storiesRepository.updateStory(storyId, update);

	if (publishing) {
		enqueueNotifyFollowers({
			type: 'story_published',
			authorId: userId,
			storyId,
			storyTitle: updated.title ?? story.title,
		});
	}

	return updated;
}

export async function deleteStory(storyId: string, userId: string) {
	await requireAuthor(storyId, userId);
	await storiesRepository.deleteStory(storyId);
}

export async function listPublishedStoriesByAuthor(authorId: string) {
	return storiesRepository.listPublishedStoriesByAuthor(authorId);
}
