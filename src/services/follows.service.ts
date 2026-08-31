import * as followsRepository from '../repositories/follows.repository';
import * as usersRepository from '../repositories/users.repository';
import * as notificationsService from './notifications.service';
import { ApiError } from '../utils/ApiError';

function assertNotSelf(followerId: string, followedId: string) {
	if (followerId === followedId) {
		throw new ApiError(400, 'You cannot follow yourself');
	}
}

export async function follow(followerId: string, followedId: string) {
	assertNotSelf(followerId, followedId);
	const result = await followsRepository.follow(followerId, followedId);

	void usersRepository
		.findById(followerId)
		.then((actor) =>
			notificationsService.notifyNewFollower(followedId, followerId, actor?.username),
		)
		.catch((error) => console.error('new_follower notification failed', error));

	return result;
}

export async function unfollow(followerId: string, followedId: string) {
	assertNotSelf(followerId, followedId);
	await followsRepository.unfollow(followerId, followedId);
}

export function listFollowers(userId: string, limit: number, offset: number) {
	return followsRepository.listFollowers(userId, limit, offset);
}

export function listFollowing(userId: string, limit: number, offset: number) {
	return followsRepository.listFollowing(userId, limit, offset);
}

export function isFollowing(followerId: string, followedId: string) {
	return followsRepository.isFollowing(followerId, followedId);
}
// Follow service stub.
// TODO: reject follower_id === followed_id with a 400, then coordinate
// idempotent follow/unfollow operations and follower/following reads.
