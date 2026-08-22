import * as progressRepository from '../repositories/progress.repository';
import { ApiError } from '../utils/ApiError';
import type { ProgressInput } from '../validators/progress.validator';

export async function updateProgress(userId: string, storyId: string, input: ProgressInput) {
	if (input.last_chapter_id) {
		const chapter = await progressRepository.findChapterInStory(storyId, input.last_chapter_id);

		if (!chapter) {
			throw new ApiError(400, 'The chapter does not belong to this story');
		}
	}

	return progressRepository.upsertProgress(
		userId,
		storyId,
		input.last_chapter_id,
		input.last_panel_index ?? null,
	);
}

export function getLibrary(userId: string) {
	return progressRepository.listLibrary(userId);
}
// Reading progress service stub.
// TODO: validate that the chapter belongs to the story, then upsert progress
// for req.user.id and return resume points together with library entries.
