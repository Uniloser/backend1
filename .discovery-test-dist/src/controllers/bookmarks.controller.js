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
const bookmarksService = __importStar(require("../services/bookmarks.service"));
const bookmarks_validator_1 = require("../validators/bookmarks.validator");
async function createBookmark(request, response) {
    const input = bookmarks_validator_1.createBookmarkSchema.parse(request.body);
    const bookmark = await bookmarksService.createBookmark(request.user.id, input);
    response.status(201).json({ data: bookmark });
}
async function listBookmarks(request, response) {
    const bookmarks = await bookmarksService.listBookmarks(request.user.id);
    response.json({ data: bookmarks });
}
async function deleteBookmark(request, response) {
    const bookmarkId = bookmarks_validator_1.bookmarkIdSchema.parse(request.params.id);
    const result = await bookmarksService.deleteBookmark(request.user.id, bookmarkId);
    response.json({ data: result });
}
async function deleteBookmarkByStory(request, response) {
    const storyId = bookmarks_validator_1.storyIdSchema.parse(request.params.storyId);
    const result = await bookmarksService.deleteBookmarkByStory(request.user.id, storyId);
    response.json({ data: result });
}
