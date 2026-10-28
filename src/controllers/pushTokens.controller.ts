import * as pushTokensRepository from '../repositories/pushTokens.repository';
import { env } from '../config/env';
import { z } from 'zod';

const pushTokenSchema = z.object({
	token: z.string().min(1),
	platform: z.enum(['ios', 'android', 'web']),
});

export async function getConfig(_request: any, response: any) {
	const configured = Boolean(env.webPushVapidPublicKey && env.webPushVapidPrivateKey && env.webPushVapidSubject);
	response.json({ data: { web_push_enabled: configured, web_push_public_key: configured ? env.webPushVapidPublicKey : null } });
}

export async function register(request: any, response: any) {
	const input = pushTokenSchema.parse(request.body);
	const token = await pushTokensRepository.upsert({
		userId: request.user.id,
		...input,
	});
	response.status(201).json({ data: token });
}

export async function unregister(request: any, response: any) {
	const input = pushTokenSchema.pick({ token: true }).parse(request.body);
	await pushTokensRepository.remove(request.user.id, input.token);
	response.status(204).send();
}
