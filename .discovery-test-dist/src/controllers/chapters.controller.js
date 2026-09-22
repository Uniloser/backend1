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
const chaptersService = __importStar(require("../services/chapters.service"));
const chapters_schema_1 = require("../validators/chapters.schema");
async function listChapters(request, response) {
    const chapters = await chaptersService.listChapters(request.params.storyId, request.user?.id);
    response.json({ data: chapters });
}
async function getChapter(request, response) {
    const chapter = await chaptersService.getChapter(request.params.id, request.user?.id);
    response.json({ data: chapter });
}
async function createChapter(request, response) {
    const input = chapters_schema_1.createChapterSchema.parse(request.body);
    const chapter = await chaptersService.createChapter(request.params.storyId, request.user.id, input);
    response.status(201).json({ data: chapter });
}
async function updateChapter(request, response) {
    const input = chapters_schema_1.updateChapterSchema.parse(request.body);
    const chapter = await chaptersService.updateChapter(request.params.id, request.user.id, input);
    response.json({ data: chapter });
}
// Handles PATCH /chapters/:id/status – the only endpoint allowed to change publication state.
async function updateChapterStatus(request, response) {
    const input = chapters_schema_1.updateChapterStatusSchema.parse(request.body);
    const chapter = await chaptersService.updateChapterStatus(request.params.id, request.user.id, input);
    response.json({ data: chapter });
}
async function deleteChapter(request, response) {
    await chaptersService.deleteChapter(request.params.id, request.user.id);
    response.status(204).send();
}
async function reorderChapters(request, response) {
    const input = chapters_schema_1.reorderChaptersSchema.parse(request.body);
    await chaptersService.reorderChapters(request.params.storyId, request.user.id, input);
    response.status(204).send();
}
async function getAutosave(request, response) {
    const data = await chaptersService.getAutosave(request.params.id, request.user.id);
    response.json({ data });
}
async function saveAutosave(request, response) {
    const { content } = request.body;
    if (typeof content !== 'string') {
        response.status(400).json({ error: 'content must be a string' });
        return;
    }
    const data = await chaptersService.saveAutosave(request.params.id, request.user.id, content);
    response.json({ data });
}
