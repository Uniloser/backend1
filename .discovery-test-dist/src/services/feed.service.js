"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeed = getFeed;
exports.discover = discover;
exports.trending = trending;
exports.discoverFollowing = discoverFollowing;
exports.search = search;
const redis_1 = require("../config/redis");
const feedRepository = __importStar(require("../repositories/feed.repository"));
const discoveryRepository = __importStar(require("../repositories/discovery.repository"));
const filters_1 = require("../discovery/filters");
async function cached(key, loader) {
    const redis = (0, redis_1.getRedis)();
    if (!redis) {
        return loader();
    }
    const existing = await redis.get(key);
    if (existing) {
        return JSON.parse(existing);
    }
    const value = await loader();
    await redis.set(key, JSON.stringify(value), 'EX', 30);
    return value;
}
function getFeed(userId, limit = 20) {
    return cached(`feed:${userId}:${limit}`, async () => {
        const [followedChapters, recentReleases] = await Promise.all([
            feedRepository.listFollowedChapters(userId, limit),
            feedRepository.listRecentReleases(limit),
        ]);
        return { followedChapters, recentReleases };
    });
}
async function discover(genre, limit, offset, userId) {
    return (await discoveryRepository.browse({ genre, limit, offset, userId })).map(filters_1.storyCard);
}
async function trending(limit, userId) {
    return (await discoveryRepository.browse({ limit, offset: 0, userId, trending: true })).map(filters_1.storyCard);
}
async function discoverFollowing(userId, limit = 20) {
    return (await discoveryRepository.browse({ limit, offset: 0, userId, following: true })).map(filters_1.storyCard);
}
async function search(query, limit, offset, userId) {
    return (await discoveryRepository.browse({ query, limit, offset, userId })).map(filters_1.storyCard);
}
// Feed/discovery business-logic stub.
// TODO: combine followed-author chapters, selected-genre trends, and recent
// releases with plain SQL ordering; implement genre browse, decayed trending,
// title/tag search, and short-TTL Redis caching for expensive reads.
