import * as notificationsService from '../services/notifications.service';
import {
	listNotificationsQuerySchema,
	notificationIdSchema,
} from '../validators/notifications.validator';

export async function listNotifications(request: any, response: any) {
	const query = listNotificationsQuerySchema.parse(request.query);
	const notifications = await notificationsService.listNotifications(
		request.user.id,
		query.limit,
		query.offset,
	);
	response.json({ data: notifications });
}

export async function unreadCount(request: any, response: any) {
	const result = await notificationsService.unreadCount(request.user.id);
	response.json({ data: result });
}

export async function markRead(request: any, response: any) {
	const notificationId = notificationIdSchema.parse(request.params.id);
	const notification = await notificationsService.markRead(request.user.id, notificationId);
	response.json({ data: notification });
}

export async function markAllRead(request: any, response: any) {
	const result = await notificationsService.markAllRead(request.user.id);
	response.json({ data: result });
}
