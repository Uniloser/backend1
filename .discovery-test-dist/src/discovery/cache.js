"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
const redis_1 = require("../config/redis");
const config_1 = require("./config");
const local = new Map();
async function cacheGet(key) {
    try {
        const redis = (0, redis_1.getRedis)();
        if (redis) {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : undefined;
        }
    }
    catch { /* Cache failure must not fail discovery. */ }
    const entry = local.get(key);
    if (entry && entry.until > Date.now())
        return entry.value;
    local.delete(key);
    return undefined;
}
async function cacheSet(key, value, seconds) {
    try {
        const redis = (0, redis_1.getRedis)();
        if (redis) {
            await redis.set(key, JSON.stringify(value), 'EX', seconds);
            return;
        }
    }
    catch { /* Bounded single-process fallback. */ }
    if (local.size >= config_1.DISCOVERY_CONFIG.cache.maxLocalEntries)
        local.delete(local.keys().next().value);
    local.set(key, { value, until: Date.now() + seconds * 1000 });
}
