import * as storyViewsRepository from '../repositories/storyViews.repository';
import * as progressRepository from '../repositories/progress.repository';
import * as storiesRepository from '../repositories/stories.repository';
import { ApiError } from '../utils/ApiError';
import type { RecordStoryViewInput } from '../validators/storyViews.validator';

export async function recordView(
	storyId: string,
	userId: string | undefined,
	input: RecordStoryViewInput,
) {
	const story = await storiesRepository.findStory(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	if (story.status === 'draft' && story.author_id !== userId) {
		throw new ApiError(404, 'Story not found');
	}

	if (input.chapter_id) {
		const chapter = await progressRepository.findChapterInStory(storyId, input.chapter_id);
		if (!chapter) {
			throw new ApiError(400, 'The chapter does not belong to this story');
		}
	}

	const view = await storyViewsRepository.createView({
		story_id: storyId,
		user_id: userId ?? null,
		chapter_id: input.chapter_id ?? null,
		session_id: input.session_id ?? null,
		metadata: input.metadata,
	});

	const counts = await storyViewsRepository.incrementStoryViewCount(storyId);

	return { view, view_count: counts.view_count };
}
