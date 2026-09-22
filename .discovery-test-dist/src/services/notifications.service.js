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
exports.createNotification = createNotification;
exports.listNotifications = listNotifications;
exports.unreadCount = unreadCount;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
exports.notifyNewFollower = notifyNewFollower;
exports.notifyLike = notifyLike;
exports.notifyComment = notifyComment;
exports.notifyStoryPublished = notifyStoryPublished;
exports.notifyChapterPublished = notifyChapterPublished;
const notificationsRepository = __importStar(require("../repositories/notifications.repository"));
const ApiError_1 = require("../utils/ApiError");
const push_service_1 = require("./push.service");
async function createNotification(input) {
    if (input.recipient_id === input.actor_id) {
        return null;
    }
    const notification = await notificationsRepository.createNotification(input);
    await notificationsRepository.createDeliveries(notification.id);
    void (0, push_service_1.sendPushToUser)(input.recipient_id, input.title, input.body ?? '', {
        notificationId: notification.id,
        type: input.notification_type,
        ...input.data,
    }).catch((error) => {
        console.error('[push] delivery failed', error);
    });
    return notification;
}
function listNotifications(recipientId, limit, offset) {
    return notificationsRepository.listForRecipient(recipientId, limit, offset);
}
async function unreadCount(recipientId) {
    const count = await notificationsRepository.countUnread(recipientId);
    return { count };
}
async function markRead(recipientId, notificationId) {
    const notification = await notificationsRepository.markRead(notificationId, recipientId);
    if (!notification) {
        throw new ApiError_1.ApiError(404, 'Notification not found');
    }
    return notification;
}
async function markAllRead(recipientId) {
    const updated = await notificationsRepository.markAllRead(recipientId);
    return { updated: updated.length };
}
function notifyNewFollower(recipientId, actorId, actorUsername) {
    return createNotification({
        recipient_id: recipientId,
        actor_id: actorId,
        notification_type: 'new_follower',
        title: 'New follower',
        body: actorUsername ? `${actorUsername} started following you` : 'Someone started following you',
        data: { actor_id: actorId },
    });
}
function notifyLike(recipientId, actorId, storyId, storyTitle) {
    return createNotification({
        recipient_id: recipientId,
        actor_id: actorId,
        notification_type: 'like',
        title: 'New like',
        body: storyTitle ? `Someone liked “${storyTitle}”` : 'Someone liked your story',
        story_id: storyId,
        data: { story_id: storyId },
    });
}
function notifyComment(recipientId, actorId, storyId, chapterId, commentId) {
    return createNotification({
        recipient_id: recipientId,
        actor_id: actorId,
        notification_type: 'comment',
        title: 'New comment',
        body: 'Someone commented on your chapter',
        story_id: storyId,
        chapter_id: chapterId,
        comment_id: commentId,
        data: { story_id: storyId, chapter_id: chapterId, comment_id: commentId },
    });
}
function notifyStoryPublished(recipientId, actorId, storyId, storyTitle) {
    return createNotification({
        recipient_id: recipientId,
        actor_id: actorId,
        notification_type: 'story_published',
        title: 'New story',
        body: `“${storyTitle}” was just published`,
        story_id: storyId,
        data: { story_id: storyId },
    });
}
function notifyChapterPublished(recipientId, actorId, storyId, chapterId, chapterTitle) {
    return createNotification({
        recipient_id: recipientId,
        actor_id: actorId,
        notification_type: 'chapter_published',
        title: 'New chapter',
        body: `“${chapterTitle}” was just published`,
        story_id: storyId,
        chapter_id: chapterId,
        data: { story_id: storyId, chapter_id: chapterId },
    });
}
