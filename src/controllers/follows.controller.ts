import * as followsService from '../services/follows.service';
import { paginationSchema, userIdSchema } from '../validators/follows.validator';

export async function follow(request: any, response: any) {
	const followedId = userIdSchema.parse(request.params.id);
	const result = await followsService.follow(request.user.id, followedId);
	response.status(201).json({ data: result });
}

export async function unfollow(request: any, response: any) {
	const followedId = userIdSchema.parse(request.params.id);
	await followsService.unfollow(request.user.id, followedId);
	response.status(204).send();
}

export async function listFollowers(request: any, response: any) {
	const userId = userIdSchema.parse(request.params.id);
	const { limit, offset } = paginationSchema.parse(request.query);
	const followers = await followsService.listFollowers(userId, limit, offset);
	response.json({ data: followers, pagination: { limit, offset } });
}

export async function listFollowing(request: any, response: any) {
	const userId = userIdSchema.parse(request.params.id);
	const { limit, offset } = paginationSchema.parse(request.query);
	const following = await followsService.listFollowing(userId, limit, offset);
	response.json({ data: following, pagination: { limit, offset } });
}
// Follow controller stub.
// TODO: delegate follow/unfollow and follower/following list requests using
// req.user.id for the follower identity.
