import * as storyViewsService from '../services/storyViews.service';
import { recordStoryViewSchema, storyIdSchema } from '../validators/storyViews.validator';

export async function recordView(request: any, response: any) {
	const storyId = storyIdSchema.parse(request.params.id);
	const input = recordStoryViewSchema.parse(request.body ?? {});
	const result = await storyViewsService.recordView(storyId, request.user?.id, input);
	response.status(201).json({ data: result });
}
