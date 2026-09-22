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
exports.getPublicProfile = getPublicProfile;
exports.getCurrentProfile = getCurrentProfile;
exports.updateCurrentProfile = updateCurrentProfile;
exports.getPublishedStories = getPublishedStories;
exports.getCurrentStories = getCurrentStories;
exports.getCurrentFollowerCount = getCurrentFollowerCount;
const usersRepository = __importStar(require("../repositories/users.repository"));
const ApiError_1 = require("../utils/ApiError");
const stories_repository_1 = require("../repositories/stories.repository");
async function getPublicProfile(username) {
    const profile = await usersRepository.findByUsername(username);
    if (!profile) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    const [publishedStories, followerCount] = await Promise.all([
        usersRepository.listPublishedStories(profile.id),
        usersRepository.countFollowers(profile.id),
    ]);
    return { ...profile, publishedStories, followerCount };
}
async function getCurrentProfile(userId) {
    const profile = await usersRepository.findById(userId);
    if (!profile) {
        throw new ApiError_1.ApiError(404, 'User profile not found');
    }
    return profile;
}
async function updateCurrentProfile(userId, input) {
    return usersRepository.updateById(userId, input);
}
async function getPublishedStories(username) {
    const profile = await usersRepository.findByUsername(username);
    if (!profile) {
        throw new ApiError_1.ApiError(404, 'User not found');
    }
    return (0, stories_repository_1.listPublishedStoriesByAuthor)(profile.id);
}
function getCurrentStories(userId) {
    return (0, stories_repository_1.listStoriesByAuthor)(userId);
}
function getCurrentFollowerCount(userId) {
    return usersRepository.countFollowers(userId);
}
// User service stub.
// TODO: compose users.repository.js profile data with published story and
// follower counts; enforce profile update permissions and input contracts.
// TODO: reject self-follow with a clean 400 before the database constraint can
// produce a raw Postgres error.
