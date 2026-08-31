import { env } from './env';

let client: any;

export function getRedis() {
	if (!env.redisUrl) {
		return undefined;
	}

	if (!client) {
		const Redis = require('ioredis');
		client = new Redis(env.redisUrl);
	}

	return client;
}
// Redis client stub.
// TODO: create and export the Redis connection and cache helpers used by the
// feed/discovery/search read path with a short TTL.
