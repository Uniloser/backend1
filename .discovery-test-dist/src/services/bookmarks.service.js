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
exports.createBookmark = createBookmark;
exports.listBookmarks = listBookmarks;
exports.deleteBookmark = deleteBookmark;
exports.deleteBookmarkByStory = deleteBookmarkByStory;
const bookmarksRepository = __importStar(require("../repositories/bookmarks.repository"));
const progressRepository = __importStar(require("../repositories/progress.repository"));
const storiesRepository = __importStar(require("../repositories/stories.repository"));
const ApiError_1 = require("../utils/ApiError");
async function createBookmark(userId, input) {
    const story = await storiesRepository.findStory(input.story_id);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (input.chapter_id) {
        const chapter = await progressRepository.findChapterInStory(input.story_id, input.chapter_id);
        if (!chapter) {
            throw new ApiError_1.ApiError(400, 'The chapter does not belong to this story');
        }
    }
    return bookmarksRepository.upsertStoryLevel(userId, {
        story_id: input.story_id,
        chapter_id: input.chapter_id ?? null,
        note: input.note ?? null,
    });
}
function listBookmarks(userId) {
    return bookmarksRepository.listByUser(userId);
}
async function deleteBookmark(userId, bookmarkId) {
    const deleted = await bookmarksRepository.deleteById(bookmarkId, userId);
    if (!deleted) {
        throw new ApiError_1.ApiError(404, 'Bookmark not found');
    }
    return { deleted: true };
}
async function deleteBookmarkByStory(userId, storyId) {
    const deleted = await bookmarksRepository.deleteByStory(userId, storyId);
    return { deleted: true, count: deleted.length };
}
