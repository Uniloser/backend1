import * as storiesRepository from '../repositories/stories.repository';
import * as followsRepository from '../repositories/follows.repository';
import { enqueueNotifyFollowers } from '../jobs/notifyFollowers.job';
import { ApiError } from '../utils/ApiError';
import type { CreateStoryInput, UpdateStoryInput } from '../validators/stories.schema';
import * as genresService from './genres.service';
import { requireReadableStory } from '../discovery/access';
import { getSimilarStories } from './discovery.service';
import { getSupabaseAdmin } from '../config/supabase';
import { MINIMUM_FREE_CHAPTERS } from '../config/premium';

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
	const genre = await genresService.requireGenre(input.genre);
	return storiesRepository.createStory({
		...input,
		genre: genre.name,
		genre_id: genre.id,
		author_id: authorId,
		tags: input.tags ?? [],
		content_type: input.content_type ?? 'text',
		status: 'draft',
	});
}

export async function getStory(storyId: string, userId?: string) {
	await requireReadableStory(storyId,userId);
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
	if (input.access_type === 'PREMIUM' || input.free_chapter_count !== undefined) {
		const { data: creator, error: creatorError } = await getSupabaseAdmin()
			.from('creator_monetization_profiles').select('status').eq('user_id', userId).maybeSingle();
		if (creatorError) throw creatorError;
		if (creator?.status !== 'APPROVED') throw new ApiError(403, 'Your creator account is not approved for premium stories.');
		const freeCount = input.free_chapter_count ?? story.free_chapter_count ?? MINIMUM_FREE_CHAPTERS;
		if (freeCount < MINIMUM_FREE_CHAPTERS) throw new ApiError(400, `Premium stories require at least ${MINIMUM_FREE_CHAPTERS} free chapters.`);
		const publishedCount = await storiesRepository.countPublishedChapters(storyId);
		if (freeCount > publishedCount) throw new ApiError(400, 'The free preview cannot exceed the number of published chapters.');
		update.free_chapter_count = freeCount;
		update.monetization_enabled = input.access_type === 'PREMIUM' || (input.access_type === undefined && story.access_type === 'PREMIUM');
	}
	if (input.access_type === 'FREE') update.monetization_enabled = false;
	if (input.genre) {
		const genre = await genresService.requireGenre(input.genre);
		update.genre = genre.name;
		update.genre_id = genre.id;
	}
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

export async function getMonetizationStatus(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('creator_monetization_profiles').select('status, approved_at, suspended_at').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return data ?? { status: 'NOT_ELIGIBLE', approved_at: null, suspended_at: null };
}

export async function deleteStory(storyId: string, userId: string) {
	await requireAuthor(storyId, userId);
	await storiesRepository.deleteStory(storyId);
}

export async function listPublishedStoriesByAuthor(authorId: string) {
	return storiesRepository.listPublishedStoriesByAuthor(authorId);
}

export async function getRecommendations(storyId: string, limit = 8,userId?:string) {
	return getSimilarStories(storyId,userId,limit);
}
