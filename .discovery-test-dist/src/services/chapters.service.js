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
exports.listChapters = listChapters;
exports.getChapter = getChapter;
exports.createChapter = createChapter;
exports.updateChapter = updateChapter;
exports.updateChapterStatus = updateChapterStatus;
exports.deleteChapter = deleteChapter;
exports.reorderChapters = reorderChapters;
exports.getAutosave = getAutosave;
exports.saveAutosave = saveAutosave;
const ApiError_1 = require("../utils/ApiError");
const access_1 = require("../discovery/access");
const chaptersRepository = __importStar(require("../repositories/chapters.repository"));
const panelsRepository = __importStar(require("../repositories/panels.repository"));
const notifyFollowers_job_1 = require("../jobs/notifyFollowers.job");
async function requireStoryAuthor(storyId, userId) {
    const story = await chaptersRepository.findStoryOwner(storyId);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (story.author_id !== userId) {
        throw new ApiError_1.ApiError(403, 'Only the story author can manage chapters');
    }
    return story;
}
async function requireChapter(chapterId) {
    const chapter = await chaptersRepository.findChapter(chapterId);
    if (!chapter) {
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    }
    return chapter;
}
async function attachPanelMetadata(chapters) {
    const comicChapterIds = chapters
        .filter((chapter) => chapter.content_type === 'comic')
        .map((chapter) => chapter.id);
    if (comicChapterIds.length === 0) {
        return chapters;
    }
    const counts = await panelsRepository.countPanelsByChapterIds(comicChapterIds);
    return chapters.map((chapter) => (chapter.content_type === 'comic'
        ? { ...chapter, panel_count: counts[chapter.id] ?? 0 }
        : chapter));
}
async function attachChapterPanels(chapter, userId) {
    if (chapter.content_type !== 'comic') {
        return chapter;
    }
    if (chapter.status !== 'published') {
        const story = await chaptersRepository.findStoryOwner(chapter.story_id);
        if (!story || story.author_id !== userId) {
            return { ...chapter, panels: [] };
        }
    }
    const panels = await panelsRepository.listPanels(chapter.id);
    return { ...chapter, panels, panel_count: panels.length };
}
async function validateComicPublish(chapterId) {
    const panelCount = await panelsRepository.countPanels(chapterId);
    if (panelCount === 0) {
        throw new ApiError_1.ApiError(400, 'Comic chapters must have at least one panel before publishing');
    }
}
async function listChapters(storyId, userId) {
    await (0, access_1.requireReadableStory)(storyId, userId);
    const story = await chaptersRepository.findStoryOwner(storyId);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    const chapters = await chaptersRepository.listChapters(storyId);
    const visible = story.author_id === userId
        ? chapters
        : chapters.filter((chapter) => chapter.status === 'published');
    return attachPanelMetadata(visible);
}
async function getChapter(chapterId, userId) {
    const chapter = await requireChapter(chapterId);
    await (0, access_1.requireReadableStory)(chapter.story_id, userId);
    if (chapter.status === 'published') {
        return attachChapterPanels(chapter, userId);
    }
    const story = await chaptersRepository.findStoryOwner(chapter.story_id);
    if (!story || story.author_id !== userId) {
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    }
    return attachChapterPanels(chapter, userId);
}
async function createChapter(storyId, userId, input) {
    const story = await requireStoryAuthor(storyId, userId);
    const status = input.status ?? 'draft';
    const contentType = input.content_type ?? (story.content_type === 'comic' ? 'comic' : 'text');
    if (story.content_type === 'text' && contentType === 'comic') {
        throw new ApiError_1.ApiError(400, 'Cannot add comic chapters to a text story');
    }
    if (story.content_type === 'comic' && contentType === 'text') {
        throw new ApiError_1.ApiError(400, 'Cannot add text chapters to a comic story');
    }
    const chapter = await chaptersRepository.createChapter({
        story_id: storyId,
        title: input.title,
        content: contentType === 'comic' ? '' : (input.content ?? ''),
        content_type: contentType,
        status,
        chapter_order: await chaptersRepository.findNextChapterOrder(storyId),
        published_at: status === 'published' ? new Date().toISOString() : null,
    });
    if (status === 'published' && contentType === 'comic') {
        await validateComicPublish(chapter.id);
    }
    if (status === 'published') {
        (0, notifyFollowers_job_1.enqueueNotifyFollowers)({
            type: 'chapter_published',
            authorId: userId,
            storyId,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
        });
    }
    return contentType === 'comic'
        ? { ...chapter, panel_count: 0, panels: [] }
        : chapter;
}
async function updateChapter(chapterId, userId, input) {
    const chapter = await requireChapter(chapterId);
    const story = await requireStoryAuthor(chapter.story_id, userId);
    // Build a strict partial update – only include fields that were explicitly provided.
    // This prevents auto-saves that only send { title, content } from touching status.
    const update = {};
    if (input.title !== undefined) {
        update.title = input.title;
    }
    const contentType = (input.content_type ?? chapter.content_type ?? story.content_type ?? 'text');
    if (input.content_type && input.content_type !== chapter.content_type) {
        throw new ApiError_1.ApiError(400, 'Chapter content type cannot be changed after creation');
    }
    if (contentType === 'comic' && input.content !== undefined && input.content.trim().length > 0) {
        throw new ApiError_1.ApiError(400, 'Comic chapters store content in panels, not text');
    }
    if (input.content !== undefined) {
        update.content = contentType === 'comic' ? '' : input.content;
    }
    // Only mutate status / published_at when status is explicitly provided AND changing.
    const statusChanging = input.status !== undefined && input.status !== chapter.status;
    const publishing = input.status === 'published' && chapter.status !== 'published';
    if (publishing && contentType === 'comic') {
        await validateComicPublish(chapterId);
    }
    if (statusChanging) {
        update.status = input.status;
        if (input.status === 'published') {
            update.published_at = new Date().toISOString();
        }
        else if (input.status === 'draft') {
            update.published_at = null;
        }
    }
    const updated = await chaptersRepository.updateChapter(chapterId, update);
    if (publishing) {
        (0, notifyFollowers_job_1.enqueueNotifyFollowers)({
            type: 'chapter_published',
            authorId: userId,
            storyId: chapter.story_id,
            chapterId,
            chapterTitle: updated.title ?? chapter.title,
        });
    }
    return attachChapterPanels(updated, userId);
}
// Dedicated status-transition helper used by PATCH /chapters/:id/status.
async function updateChapterStatus(chapterId, userId, input) {
    return updateChapter(chapterId, userId, { status: input.status });
}
async function deleteChapter(chapterId, userId) {
    const chapter = await requireChapter(chapterId);
    await requireStoryAuthor(chapter.story_id, userId);
    await chaptersRepository.deleteChapter(chapterId);
    await chaptersRepository.resequenceChapters(chapter.story_id);
}
async function reorderChapters(storyId, userId, input) {
    await requireStoryAuthor(storyId, userId);
    const orders = input.chapters.map((chapter) => chapter.chapter_order);
    if (new Set(orders).size !== orders.length) {
        throw new ApiError_1.ApiError(400, 'Chapter orders must be unique');
    }
    await chaptersRepository.reorderChapters(storyId, input.chapters);
}
async function getAutosave(chapterId, userId) {
    const chapter = await requireChapter(chapterId);
    await requireStoryAuthor(chapter.story_id, userId);
    return chaptersRepository.getAutosave(chapterId);
}
async function saveAutosave(chapterId, userId, content) {
    const chapter = await requireChapter(chapterId);
    await requireStoryAuthor(chapter.story_id, userId);
    return chaptersRepository.saveAutosave(chapterId, content);
}
