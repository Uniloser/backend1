import * as feedService from '../services/feed.service';
import { discoveryQuerySchema, searchQuerySchema } from '../validators/stories.schema';

export async function getFeed(request: any, response: any) {
	const { limit } = discoveryQuerySchema.parse(request.query);
	const feed = await feedService.getFeed(request.user.id, limit);
	response.json({ data: feed });
}

export async function discover(request: any, response: any) {
	const { genre, limit, offset } = discoveryQuerySchema.parse(request.query);
	const stories = await feedService.discover(genre, limit, offset);
	response.json({ data: stories, pagination: { limit, offset } });
}

export async function trending(request: any, response: any) {
	const { limit } = discoveryQuerySchema.parse(request.query);
	const stories = await feedService.trending(limit);
	response.json({ data: stories });
}

export async function search(request: any, response: any) {
	const { q, limit, offset } = searchQuerySchema.parse(request.query);
	const stories = await feedService.search(q, limit, offset);
	response.json({ data: stories, pagination: { limit, offset } });
}
// Feed/discovery controller stub.
// TODO: parse pagination, genre, and search query parameters and delegate feed,
// discovery, trending, and search behavior to feed.service.js.
// TODO: return library/progress results scoped to req.user.id.
