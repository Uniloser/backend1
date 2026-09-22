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
exports.recordView = recordView;
const storyViewsRepository = __importStar(require("../repositories/storyViews.repository"));
const progressRepository = __importStar(require("../repositories/progress.repository"));
const storiesRepository = __importStar(require("../repositories/stories.repository"));
const ApiError_1 = require("../utils/ApiError");
const access_1 = require("../discovery/access");
async function recordView(storyId, userId, input) {
    await (0, access_1.requireReadableStory)(storyId, userId);
    const story = await storiesRepository.findStory(storyId);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (story.status === 'draft' && story.author_id !== userId) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (input.chapter_id) {
        const chapter = await progressRepository.findChapterInStory(storyId, input.chapter_id);
        if (!chapter) {
            throw new ApiError_1.ApiError(400, 'The chapter does not belong to this story');
        }
    }
    const view = await storyViewsRepository.createView({
        story_id: storyId,
        user_id: userId ?? null,
        chapter_id: input.chapter_id ?? null,
        session_id: input.session_id ?? null,
        metadata: input.metadata,
    });
    const counts = await storyViewsRepository.incrementStoryViewCount(storyId);
    return { view, view_count: counts.view_count };
}
