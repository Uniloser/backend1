import * as storiesService from '../services/stories.service';
import { createStorySchema, updateStorySchema } from '../validators/stories.schema';

export async function createStory(request: any, response: any) {
	const input = createStorySchema.parse(request.body);
	const story = await storiesService.createStory(request.user.id, input);
	response.status(201).json({ data: story });
}

export async function getStory(request: any, response: any) {
	const story = await storiesService.getStory(request.params.id, request.user?.id);
	response.json({ data: story });
}

export async function updateStory(request: any, response: any) {
	const input = updateStorySchema.parse(request.body);
	const story = await storiesService.updateStory(request.params.id, request.user.id, input);
	response.json({ data: story });
}

export async function deleteStory(request: any, response: any) {
	await storiesService.deleteStory(request.params.id, request.user.id);
	response.status(204).send();
}
// Story controller stub.
// TODO: validate request input, pass req.user.id and route/body data to the
// stories service, and translate service results into HTTP responses.
// TODO: keep publish eligibility, author checks, draft visibility, soft/hard
// deletion, and like-count behavior in services/repositories.
