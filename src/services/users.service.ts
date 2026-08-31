import * as usersRepository from '../repositories/users.repository';
import { ApiError } from '../utils/ApiError';
import type { UpdateProfileInput } from '../validators/users.validator';
import { listPublishedStoriesByAuthor, listStoriesByAuthor } from '../repositories/stories.repository';

export async function getPublicProfile(username: string) {
	const profile = await usersRepository.findByUsername(username);

	if (!profile) {
		throw new ApiError(404, 'User not found');
	}

	const [publishedStories, followerCount] = await Promise.all([
		usersRepository.listPublishedStories(profile.id),
		usersRepository.countFollowers(profile.id),
	]);

	return { ...profile, publishedStories, followerCount };
}

export async function getCurrentProfile(userId: string) {
	const profile = await usersRepository.findById(userId);

	if (!profile) {
		throw new ApiError(404, 'User profile not found');
	}

	return profile;
}

export async function updateCurrentProfile(userId: string, input: UpdateProfileInput) {
	return usersRepository.updateById(userId, input);
}

export async function getPublishedStories(username: string) {
	const profile = await usersRepository.findByUsername(username);

	if (!profile) {
		throw new ApiError(404, 'User not found');
	}

	return listPublishedStoriesByAuthor(profile.id);
}

export function getCurrentStories(userId: string) {
	return listStoriesByAuthor(userId);
}

export function getCurrentFollowerCount(userId: string) {
	return usersRepository.countFollowers(userId);
}
// User service stub.
// TODO: compose users.repository.js profile data with published story and
// follower counts; enforce profile update permissions and input contracts.
// TODO: reject self-follow with a clean 400 before the database constraint can
// produce a raw Postgres error.
