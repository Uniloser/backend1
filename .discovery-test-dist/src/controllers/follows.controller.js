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
exports.getFollowStatus = getFollowStatus;
exports.listMyFollowing = listMyFollowing;
const followsService = __importStar(require("../services/follows.service"));
const follows_validator_1 = require("../validators/follows.validator");
async function follow(request, response) {
    const followedId = follows_validator_1.userIdSchema.parse(request.params.id);
    const result = await followsService.follow(request.user.id, followedId);
    response.status(201).json({ data: result });
}
async function unfollow(request, response) {
    const followedId = follows_validator_1.userIdSchema.parse(request.params.id);
    await followsService.unfollow(request.user.id, followedId);
    response.status(204).send();
}
async function listFollowers(request, response) {
    const userId = follows_validator_1.userIdSchema.parse(request.params.id);
    const { limit, offset } = follows_validator_1.paginationSchema.parse(request.query);
    const followers = await followsService.listFollowers(userId, limit, offset);
    response.json({ data: followers, pagination: { limit, offset } });
}
async function listFollowing(request, response) {
    const userId = follows_validator_1.userIdSchema.parse(request.params.id);
    const { limit, offset } = follows_validator_1.paginationSchema.parse(request.query);
    const following = await followsService.listFollowing(userId, limit, offset);
    response.json({ data: following, pagination: { limit, offset } });
}
async function getFollowStatus(request, response) {
    const followedId = follows_validator_1.userIdSchema.parse(request.params.id);
    const following = await followsService.isFollowing(request.user.id, followedId);
    response.json({ data: { following } });
}
async function listMyFollowing(request, response) {
    const { limit, offset } = follows_validator_1.paginationSchema.parse(request.query);
    const following = await followsService.listFollowing(request.user.id, limit, offset);
    response.json({ data: following, pagination: { limit, offset } });
}
// Follow controller stub.
// TODO: delegate follow/unfollow and follower/following list requests using
// req.user.id for the follower identity.
