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
const { Router } = require('express');
const auth_middleware_1 = require("../middleware/auth.middleware");
const chaptersController = __importStar(require("../controllers/chapters.controller"));
const asyncHandler_1 = require("../utils/asyncHandler");
const router = Router();
router.post('/stories/:storyId/chapters', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.createChapter));
router.get('/stories/:storyId/chapters', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(chaptersController.listChapters));
router.patch('/stories/:storyId/chapters/reorder', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.reorderChapters));
router.get('/chapters/:id', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(chaptersController.getChapter));
router.patch('/chapters/:id', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.updateChapter));
// Dedicated status endpoint – only way to change publication state.
router.patch('/chapters/:id/status', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.updateChapterStatus));
router.delete('/chapters/:id', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.deleteChapter));
router.get('/chapters/:id/autosave', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.getAutosave));
router.patch('/chapters/:id/autosave', auth_middleware_1.auth, (0, asyncHandler_1.asyncHandler)(chaptersController.saveAutosave));
exports.default = router;
