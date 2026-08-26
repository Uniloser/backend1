import * as pushTokensRepository from '../repositories/pushTokens.repository';
import { z } from 'zod';

const pushTokenSchema = z.object({
	token: z.string().min(1),
	platform: z.enum(['ios', 'android', 'web']),
});

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