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
exports.follow = follow;
exports.unfollow = unfollow;
exports.listFollowers = listFollowers;
exports.listFollowing = listFollowing;
exports.isFollowing = isFollowing;
const followsRepository = __importStar(require("../repositories/follows.repository"));
const usersRepository = __importStar(require("../repositories/users.repository"));
const notificationsService = __importStar(require("./notifications.service"));
const ApiError_1 = require("../utils/ApiError");
const blocks_repository_1 = require("../repositories/blocks.repository");
function assertNotSelf(followerId, followedId) {
    if (followerId === followedId) {
        throw new ApiError_1.ApiError(400, 'You cannot follow yourself');
    }
}
async function follow(followerId, followedId) {
    assertNotSelf(followerId, followedId);
    if (await (0, blocks_repository_1.isBlocked)(followerId, followedId) || await (0, blocks_repository_1.isBlocked)(followedId, followerId))
        throw new ApiError_1.ApiError(403, 'Following is unavailable between blocked accounts.');
    const result = await followsRepository.follow(followerId, followedId);
    void usersRepository
        .findById(followerId)
        .then((actor) => notificationsService.notifyNewFollower(followedId, followerId, actor?.username))
        .catch((error) => console.error('new_follower notification failed', error));
    return result;
}
async function unfollow(followerId, followedId) {
    assertNotSelf(followerId, followedId);
    await followsRepository.unfollow(followerId, followedId);
}
function listFollowers(userId, limit, offset) {
    return followsRepository.listFollowers(userId, limit, offset);
}
function listFollowing(userId, limit, offset) {
    return followsRepository.listFollowing(userId, limit, offset);
}
function isFollowing(followerId, followedId) {
    return followsRepository.isFollowing(followerId, followedId);
}
// Follow service stub.
// TODO: reject follower_id === followed_id with a 400, then coordinate
// idempotent follow/unfollow operations and follower/following reads.
