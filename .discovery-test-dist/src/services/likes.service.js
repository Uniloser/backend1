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
exports.likeStory = likeStory;
exports.unlikeStory = unlikeStory;
const likesRepository = __importStar(require("../repositories/likes.repository"));
const storiesRepository = __importStar(require("../repositories/stories.repository"));
const notificationsService = __importStar(require("./notifications.service"));
const blocks_repository_1 = require("../repositories/blocks.repository");
const ApiError_1 = require("../utils/ApiError");
async function likeStory(userId, storyId) {
    const story = await storiesRepository.findStory(storyId);
    if (!story)
        throw new ApiError_1.ApiError(404, 'Story not found');
    if (await (0, blocks_repository_1.isBlocked)(story.author_id, userId) || await (0, blocks_repository_1.isBlocked)(userId, story.author_id))
        throw new ApiError_1.ApiError(403, 'Likes are unavailable between blocked accounts.');
    const like = await likesRepository.addLike(userId, storyId);
    if (story?.author_id) {
        void notificationsService
            .notifyLike(story.author_id, userId, storyId, story.title)
            .catch((error) => console.error('like notification failed', error));
    }
    return { liked: true, like };
}
async function unlikeStory(userId, storyId) {
    await likesRepository.removeLike(userId, storyId);
    return { liked: false };
}
