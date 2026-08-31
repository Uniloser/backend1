import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import * as pushTokensRepository from '../repositories/pushTokens.repository';

const expo = new Expo();

export async function sendPushToUser(
	userId: string,
	title: string,
	body: string,
	data: Record<string, unknown> = {},
) {
	const registeredTokens = await pushTokensRepository.listForUser(userId);
	const messages: ExpoPushMessage[] = registeredTokens
		.filter(({ token }) => Expo.isExpoPushToken(token))
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
}