import { getRedis } from '../config/redis';
import { DISCOVERY_CONFIG as C } from './config';
const local = new Map<string, { value: unknown; until: number }>();
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try { const redis = getRedis(); if (redis) { const value = await redis.get(key); return value ? JSON.parse(value) : undefined; } } catch { /* Cache failure must not fail discovery. */ }
  const entry = local.get(key);
  if (entry && entry.until > Date.now()) return entry.value as T;
  local.delete(key); return undefined;
}
export async function cacheSet(key: string, value: unknown, seconds: number) {
  try { const redis = getRedis(); if (redis) { await redis.set(key, JSON.stringify(value), 'EX', seconds); return; } } catch { /* Bounded single-process fallback. */ }
  if (local.size >= C.cache.maxLocalEntries) local.delete(local.keys().next().value!);
  local.set(key, { value, until: Date.now() + seconds * 1000 });
}
