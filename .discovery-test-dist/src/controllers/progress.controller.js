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
exports.updateProgress = updateProgress;
exports.getLibrary = getLibrary;
const progressService = __importStar(require("../services/progress.service"));
const progress_validator_1 = require("../validators/progress.validator");
async function updateProgress(request, response) {
    const storyId = progress_validator_1.storyIdSchema.parse(request.params.id);
    const input = progress_validator_1.progressSchema.parse(request.body);
    const progress = await progressService.updateProgress(request.user.id, storyId, input);
    response.json({ data: progress });
}
async function getLibrary(request, response) {
    const library = await progressService.getLibrary(request.user.id);
    response.json({ data: library });
}
// Reading progress and library controller stub.
// TODO: upsert last_chapter_id from PUT /stories/:id/progress and list a user's
// progress/bookmarked stories from GET /library, always scoped to req.user.id.
