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
exports.listComments = listComments;
exports.createComment = createComment;
exports.deleteComment = deleteComment;
const commentsRepository = __importStar(require("../repositories/comments.repository"));
const chaptersRepository = __importStar(require("../repositories/chapters.repository"));
const notificationsService = __importStar(require("./notifications.service"));
const ApiError_1 = require("../utils/ApiError");
const blocks_repository_1 = require("../repositories/blocks.repository");
function listComments(chapterId, limit, offset) {
    return commentsRepository.listByChapter(chapterId, limit, offset);
}
async function createComment(chapterId, userId, input) {
    const chapter = await chaptersRepository.findChapter(chapterId);
    const story = chapter ? await chaptersRepository.findStoryOwner(chapter.story_id) : null;
    if (!story || !chapter)
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    if (await (0, blocks_repository_1.isBlocked)(story.author_id, userId) || await (0, blocks_repository_1.isBlocked)(userId, story.author_id))
        throw new ApiError_1.ApiError(403, 'Comments are unavailable between blocked accounts.');
    const comment = await commentsRepository.create({ chapter_id: chapterId, user_id: userId, text: input.text });
    if (story?.author_id && chapter) {
        void notificationsService
            .notifyComment(story.author_id, userId, chapter.story_id, chapterId, comment.id)
            .catch((error) => console.error('comment notification failed', error));
    }
    return comment;
}
async function deleteComment(commentId, userId) {
    const deleted = await commentsRepository.deleteById(commentId, userId);
    if (!deleted) {
        throw new ApiError_1.ApiError(404, 'Comment not found');
    }
} // Comment service stub.
// TODO: enforce authenticated ownership on create/delete, validate chapter
// visibility, and provide newest-first pagination.
