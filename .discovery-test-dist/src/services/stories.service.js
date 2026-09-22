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
exports.createStory = createStory;
exports.getStory = getStory;
exports.updateStory = updateStory;
exports.deleteStory = deleteStory;
exports.listPublishedStoriesByAuthor = listPublishedStoriesByAuthor;
exports.getRecommendations = getRecommendations;
const storiesRepository = __importStar(require("../repositories/stories.repository"));
const followsRepository = __importStar(require("../repositories/follows.repository"));
const notifyFollowers_job_1 = require("../jobs/notifyFollowers.job");
const ApiError_1 = require("../utils/ApiError");
const genresService = __importStar(require("./genres.service"));
const access_1 = require("../discovery/access");
const discovery_service_1 = require("./discovery.service");
async function requireStory(storyId) {
    const story = await storiesRepository.findStory(storyId);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    return story;
}
async function requireAuthor(storyId, userId) {
    const story = await requireStory(storyId);
    if (story.author_id !== userId) {
        throw new ApiError_1.ApiError(403, 'Only the story author can manage this story');
    }
    return story;
}
async function createStory(authorId, input) {
    const genre = await genresService.requireGenre(input.genre);
    return storiesRepository.createStory({
        ...input,
        genre: genre.name,
        genre_id: genre.id,
        author_id: authorId,
        tags: input.tags ?? [],
        content_type: input.content_type ?? 'text',
        status: 'draft',
    });
}
async function getStory(storyId, userId) {
    await (0, access_1.requireReadableStory)(storyId, userId);
    const story = await requireStory(storyId);
    if (story.status === 'draft' && story.author_id !== userId) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    const viewerFollowsAuthor = userId && userId !== story.author_id
        ? await followsRepository.isFollowing(userId, story.author_id)
        : false;
    return { ...story, viewer_follows_author: viewerFollowsAuthor };
}
async function updateStory(storyId, userId, input) {
    const story = await requireAuthor(storyId, userId);
    const update = { ...input };
    if (input.genre) {
        const genre = await genresService.requireGenre(input.genre);
        update.genre = genre.name;
        update.genre_id = genre.id;
    }
    const publishing = input.status === 'published' && story.status !== 'published';
    if (publishing) {
        const chapterCount = await storiesRepository.countChapters(storyId);
        if (chapterCount === 0) {
            throw new ApiError_1.ApiError(400, 'A story must have at least one chapter before publishing');
        }
    }
    const updated = await storiesRepository.updateStory(storyId, update);
    if (publishing) {
        (0, notifyFollowers_job_1.enqueueNotifyFollowers)({
            type: 'story_published',
            authorId: userId,
            storyId,
            storyTitle: updated.title ?? story.title,
        });
    }
    return updated;
}
async function deleteStory(storyId, userId) {
    await requireAuthor(storyId, userId);
    await storiesRepository.deleteStory(storyId);
}
async function listPublishedStoriesByAuthor(authorId) {
    return storiesRepository.listPublishedStoriesByAuthor(authorId);
}
async function getRecommendations(storyId, limit = 8, userId) {
    return (0, discovery_service_1.getSimilarStories)(storyId, userId, limit);
}
