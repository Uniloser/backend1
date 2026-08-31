import { getRedis } from '../config/redis';
import * as feedRepository from '../repositories/feed.repository';
import * as genresService from './genres.service';

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
	const redis = getRedis();

	if (!redis) {
		return loader();
	}

	const existing = await redis.get(key);

	if (existing) {
		return JSON.parse(existing) as T;
	}

	const value = await loader();
	await redis.set(key, JSON.stringify(value), 'EX', 30);
	return value;
}

export function getFeed(userId: string, limit = 20) {
	return cached(`feed:${userId}:${limit}`, async () => {
		const [followedChapters, recentReleases] = await Promise.all([
			feedRepository.listFollowedChapters(userId, limit),
			feedRepository.listRecentReleases(limit),
		]);

		return { followedChapters, recentReleases };
	});
}

export function discover(genre: string | undefined, limit: number, offset: number) {
	return cached(`discover:${genre ?? 'all'}:${limit}:${offset}`, async () => {
		const genreId = await genresService.findGenreId(genre);
		return feedRepository.listByGenre(genreId, limit, offset);
	});
}

export function trending(limit: number) {
	return cached(`trending:${limit}`, () => feedRepository.listTrending(limit));
}

export function discoverFollowing(userId: string, limit = 20) {
	return cached(`discover:following:${userId}:${limit}`, () => (
		feedRepository.listFollowedStories(userId, limit)
	));
}

export function search(query: string, limit: number, offset: number) {
	return cached(`search:${query}:${limit}:${offset}`, () => (
		feedRepository.searchStories(query, limit, offset)
	));
}
// Feed/discovery business-logic stub.
// TODO: combine followed-author chapters, selected-genre trends, and recent
// releases with plain SQL ordering; implement genre browse, decayed trending,
// title/tag search, and short-TTL Redis caching for expensive reads.
