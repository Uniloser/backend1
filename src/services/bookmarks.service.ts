import * as bookmarksRepository from '../repositories/bookmarks.repository';
import * as progressRepository from '../repositories/progress.repository';
import * as storiesRepository from '../repositories/stories.repository';
import { ApiError } from '../utils/ApiError';
import type { CreateBookmarkInput } from '../validators/bookmarks.validator';

export async function createBookmark(userId: string, input: CreateBookmarkInput) {
	const story = await storiesRepository.findStory(input.story_id);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	if (input.chapter_id) {
		const chapter = await progressRepository.findChapterInStory(input.story_id, input.chapter_id);

		if (!chapter) {
			throw new ApiError(400, 'The chapter does not belong to this story');
		}
	}

	return bookmarksRepository.upsertStoryLevel(userId, {
		story_id: input.story_id,
		chapter_id: input.chapter_id ?? null,
		note: input.note ?? null,
	});
}

export function listBookmarks(userId: string) {
	return bookmarksRepository.listByUser(userId);
}

export async function deleteBookmark(userId: string, bookmarkId: string) {
	const deleted = await bookmarksRepository.deleteById(bookmarkId, userId);

	if (!deleted) {
		throw new ApiError(404, 'Bookmark not found');
	}

	return { deleted: true };
}

export async function deleteBookmarkByStory(userId: string, storyId: string) {
	const deleted = await bookmarksRepository.deleteByStory(userId, storyId);
	return { deleted: true, count: deleted.length };
}
