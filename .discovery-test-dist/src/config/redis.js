"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedis = getRedis;
const env_1 = require("./env");
let client;
function getRedis() {
    if (!env_1.env.redisUrl) {
        return undefined;
    }
    if (!client) {
        const Redis = require('ioredis');
        client = new Redis(env_1.env.redisUrl);
    }
    return client;
}
// Redis client stub.
// TODO: create and export the Redis connection and cache helpers used by the
// feed/discovery/search read path with a short TTL.
