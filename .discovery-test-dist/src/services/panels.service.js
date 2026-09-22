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
exports.listPanels = listPanels;
exports.createPanel = createPanel;
exports.updatePanel = updatePanel;
exports.deletePanel = deletePanel;
exports.reorderPanels = reorderPanels;
exports.countPanelsForChapter = countPanelsForChapter;
const ApiError_1 = require("../utils/ApiError");
const access_1 = require("../discovery/access");
const chaptersRepository = __importStar(require("../repositories/chapters.repository"));
const panelsRepository = __importStar(require("../repositories/panels.repository"));
async function requireComicChapterAuthor(chapterId, userId) {
    const chapter = await chaptersRepository.findChapter(chapterId);
    if (!chapter) {
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    }
    const story = await chaptersRepository.findStoryOwner(chapter.story_id);
    if (!story) {
        throw new ApiError_1.ApiError(404, 'Story not found');
    }
    if (story.author_id !== userId) {
        throw new ApiError_1.ApiError(403, 'Only the story author can manage panels');
    }
    if (chapter.content_type !== 'comic') {
        throw new ApiError_1.ApiError(400, 'Panels can only be added to comic chapters');
    }
    return chapter;
}
async function requireReadableComicChapter(chapterId, userId) {
    const chapter = await chaptersRepository.findChapter(chapterId);
    if (!chapter) {
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    }
    await (0, access_1.requireReadableStory)(chapter.story_id, userId);
    if (chapter.content_type !== 'comic') {
        throw new ApiError_1.ApiError(400, 'This chapter is not a comic chapter');
    }
    if (chapter.status === 'published') {
        return chapter;
    }
    const story = await chaptersRepository.findStoryOwner(chapter.story_id);
    if (!story || story.author_id !== userId) {
        throw new ApiError_1.ApiError(404, 'Chapter not found');
    }
    return chapter;
}
async function listPanels(chapterId, userId) {
    await requireReadableComicChapter(chapterId, userId);
    return panelsRepository.listPanels(chapterId);
}
async function createPanel(chapterId, userId, input) {
    await requireComicChapterAuthor(chapterId, userId);
    return panelsRepository.createPanel({
        chapter_id: chapterId,
        panel_order: await panelsRepository.findNextPanelOrder(chapterId),
        image_url: input.image_url,
        width: input.width ?? null,
        height: input.height ?? null,
    });
}
async function updatePanel(panelId, userId, input) {
    const panel = await panelsRepository.findPanel(panelId);
    if (!panel) {
        throw new ApiError_1.ApiError(404, 'Panel not found');
    }
    await requireComicChapterAuthor(panel.chapter_id, userId);
    return panelsRepository.updatePanel(panelId, input);
}
async function deletePanel(panelId, userId) {
    const panel = await panelsRepository.findPanel(panelId);
    if (!panel) {
        throw new ApiError_1.ApiError(404, 'Panel not found');
    }
    await requireComicChapterAuthor(panel.chapter_id, userId);
    await panelsRepository.deletePanel(panelId);
    await panelsRepository.resequencePanels(panel.chapter_id);
}
async function reorderPanels(chapterId, userId, input) {
    await requireComicChapterAuthor(chapterId, userId);
    const existing = await panelsRepository.listPanels(chapterId);
    const existingIds = new Set(existing.map((panel) => panel.id));
    const orders = input.panels.map((panel) => panel.panel_order);
    if (input.panels.length !== existing.length) {
        throw new ApiError_1.ApiError(400, 'Reorder payload must include every panel in the chapter');
    }
    if (new Set(orders).size !== orders.length) {
        throw new ApiError_1.ApiError(400, 'Panel orders must be unique');
    }
    for (const panel of input.panels) {
        if (!existingIds.has(panel.id)) {
            throw new ApiError_1.ApiError(400, 'One or more panels do not belong to this chapter');
        }
    }
    await panelsRepository.reorderPanels(chapterId, input.panels);
    return panelsRepository.listPanels(chapterId);
}
async function countPanelsForChapter(chapterId) {
    return panelsRepository.countPanels(chapterId);
}
