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
exports.notifyFollowers = notifyFollowers;
exports.enqueueNotifyFollowers = enqueueNotifyFollowers;
const followsRepository = __importStar(require("../repositories/follows.repository"));
const notificationsService = __importStar(require("../services/notifications.service"));
const BATCH_SIZE = 100;
async function notifyFollowers(event) {
    let offset = 0;
    for (;;) {
        const followerIds = await followsRepository.listFollowerIds(event.authorId, BATCH_SIZE, offset);
        if (followerIds.length === 0) {
            break;
        }
        await Promise.all(followerIds.map((recipientId) => {
            if (event.type === 'story_published') {
                return notificationsService.notifyStoryPublished(recipientId, event.authorId, event.storyId, event.storyTitle);
            }
            return notificationsService.notifyChapterPublished(recipientId, event.authorId, event.storyId, event.chapterId, event.chapterTitle);
        }));
        if (followerIds.length < BATCH_SIZE) {
            break;
        }
        offset += BATCH_SIZE;
    }
}
function enqueueNotifyFollowers(event) {
    void notifyFollowers(event).catch((error) => {
        console.error('notifyFollowers failed', error);
    });
}
