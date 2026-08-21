import * as progressService from '../services/progress.service';
import { progressSchema, storyIdSchema } from '../validators/progress.validator';

export async function updateProgress(request: any, response: any) {
	const storyId = storyIdSchema.parse(request.params.id);
	const input = progressSchema.parse(request.body);
	const progress = await progressService.updateProgress(request.user.id, storyId, input);
	response.json({ data: progress });
}

export async function getLibrary(request: any, response: any) {
	const library = await progressService.getLibrary(request.user.id);
	response.json({ data: library });
}
// Reading progress and library controller stub.
// TODO: upsert last_chapter_id from PUT /stories/:id/progress and list a user's
// progress/bookmarked stories from GET /library, always scoped to req.user.id.
