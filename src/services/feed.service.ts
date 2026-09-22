import { getRedis } from '../config/redis';
import * as feedRepository from '../repositories/feed.repository';
import * as discoveryRepository from '../repositories/discovery.repository';
import { storyCard } from '../discovery/filters';

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

export async function discover(genre: string | undefined, limit: number, offset: number, userId?: string) {
	return (await discoveryRepository.browse({genre,limit,offset,userId})).map(storyCard);
}

export async function trending(limit: number,userId?:string) {
	return (await discoveryRepository.browse({limit,offset:0,userId,trending:true})).map(storyCard);
}

export async function discoverFollowing(userId: string, limit = 20) {
	return (await discoveryRepository.browse({limit,offset:0,userId,following:true})).map(storyCard);
}

export async function search(query: string, limit: number, offset: number,userId?:string) {
	return (await discoveryRepository.browse({query,limit,offset,userId})).map(storyCard);
}
// Feed/discovery business-logic stub.
// TODO: combine followed-author chapters, selected-genre trends, and recent
// releases with plain SQL ordering; implement genre browse, decayed trending,
// title/tag search, and short-TTL Redis caching for expensive reads.
