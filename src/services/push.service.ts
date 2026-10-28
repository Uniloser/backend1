import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { env } from '../config/env';
import * as pushTokensRepository from '../repositories/pushTokens.repository';

const expo = new Expo();
let warnedMissingWebPushConfig = false;
const webPush = require('web-push') as {
	setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
	sendNotification: (subscription: unknown, payload: string, options?: { TTL?: number }) => Promise<unknown>;
};

type WebPushSubscription = {
	endpoint: string;
	keys: { p256dh: string; auth: string };
};

function configureWebPush() {
	const { webPushVapidPublicKey: publicKey, webPushVapidPrivateKey: privateKey, webPushVapidSubject: subject } = env;
	if (!publicKey && !privateKey && !subject) return false;
	if (!publicKey || !privateKey || !subject) {
		throw new Error('WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_PRIVATE_KEY, and WEB_PUSH_VAPID_SUBJECT must be configured together.');
	}
	webPush.setVapidDetails(subject, publicKey, privateKey);
	return true;
}

function parseSubscription(token: string): WebPushSubscription | null {
	try {
		const value = JSON.parse(token) as Partial<WebPushSubscription>;
		if (typeof value.endpoint !== 'string' || !value.keys || typeof value.keys.p256dh !== 'string' || typeof value.keys.auth !== 'string') return null;
		return value as WebPushSubscription;
	} catch {
		return null;
	}
}

export async function sendPushToUser(
	userId: string,
	title: string,
	body: string,
	data: Record<string, unknown> = {},
) {
	const registeredTokens = await pushTokensRepository.listForUser(userId);
	const messages: ExpoPushMessage[] = registeredTokens
		.filter(({ token, platform }) => platform !== 'web' && Expo.isExpoPushToken(token))
		.map(({ token }) => ({
			to: token,
			title,
			body,
			data,
			sound: 'default',
		}));

	for (const messageChunk of expo.chunkPushNotifications(messages)) {
		const tickets = await expo.sendPushNotificationsAsync(messageChunk);
		const failedTickets = tickets.filter((ticket) => ticket.status === 'error');
		if (failedTickets.length > 0) {
			console.error('[push] Expo rejected notification tickets', failedTickets);
		}
	}

	const webTokens = registeredTokens.filter(({ platform }) => platform === 'web');
	if (!webTokens.length) return;
	if (!configureWebPush()) {
		if (!warnedMissingWebPushConfig) {
			warnedMissingWebPushConfig = true;
			console.warn('[push] Web push subscriptions are registered, but VAPID keys are not configured.');
		}
		return;
	}

	const notificationId = typeof data.notificationId === 'string' ? data.notificationId : '';
	const payload = JSON.stringify({
		title,
		body,
		data: { ...data, url: notificationId ? `/profile/inbox?notificationId=${encodeURIComponent(notificationId)}` : '/profile/inbox' },
	});
	for (const { token } of webTokens) {
		const subscription = parseSubscription(token);
		if (!subscription) {
			console.error('[push] Stored web push subscription is malformed.');
			continue;
		}
		try {
			await webPush.sendNotification(subscription, payload, { TTL: 60 });
		} catch (error) {
			const failure = error as { statusCode?: number; message?: string };
			if (failure.statusCode === 404 || failure.statusCode === 410) {
				await pushTokensRepository.remove(userId, token).catch((cleanupError) => console.error('[push] Could not remove an expired browser subscription', cleanupError));
				continue;
			}
			console.error('[push] Browser push delivery failed', failure.message || error);
		}
	}
}
