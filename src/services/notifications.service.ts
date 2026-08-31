import * as notificationsRepository from '../repositories/notifications.repository';
import type { CreateNotificationInput } from '../repositories/notifications.repository';
import { ApiError } from '../utils/ApiError';
import { sendPushToUser } from './push.service';

export async function createNotification(input: CreateNotificationInput) {
	if (input.recipient_id === input.actor_id) {
		return null;
	}

	const notification = await notificationsRepository.createNotification(input);
	await notificationsRepository.createDeliveries(notification.id);
	void sendPushToUser(
		input.recipient_id,
		input.title,
		input.body ?? '',
		{
			notificationId: notification.id,
			type: input.notification_type,
			...input.data,
		},
	).catch((error) => {
		console.error('[push] delivery failed', error);
	});
	return notification;
}

export function listNotifications(recipientId: string, limit: number, offset: number) {
	return notificationsRepository.listForRecipient(recipientId, limit, offset);
}

export async function unreadCount(recipientId: string) {
	const count = await notificationsRepository.countUnread(recipientId);
	return { count };
}

export async function markRead(recipientId: string, notificationId: string) {
	const notification = await notificationsRepository.markRead(notificationId, recipientId);

	if (!notification) {
		throw new ApiError(404, 'Notification not found');
	}

	return notification;
}

export async function markAllRead(recipientId: string) {
	const updated = await notificationsRepository.markAllRead(recipientId);
	return { updated: updated.length };
}

export function notifyNewFollower(recipientId: string, actorId: string, actorUsername?: string) {
	return createNotification({
		recipient_id: recipientId,
		actor_id: actorId,
		notification_type: 'new_follower',
		title: 'New follower',
		body: actorUsername ? `${actorUsername} started following you` : 'Someone started following you',
		data: { actor_id: actorId },
	});
}

export function notifyLike(recipientId: string, actorId: string, storyId: string, storyTitle?: string) {
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

export function notifyComment(
	recipientId: string,
	actorId: string,
	storyId: string,
	chapterId: string,
	commentId: string,
) {
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

export function notifyStoryPublished(recipientId: string, actorId: string, storyId: string, storyTitle: string) {
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

export function notifyChapterPublished(
	recipientId: string,
	actorId: string,
	storyId: string,
	chapterId: string,
	chapterTitle: string,
) {
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
