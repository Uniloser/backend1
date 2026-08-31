import * as blocksService from '../services/blocks.service';
import { userIdSchema } from '../validators/blocks.validator';

export async function blockUser(request: any, response: any) {
	const blockedId = userIdSchema.parse(request.params.id);
	const block = await blocksService.blockUser(request.user.id, blockedId);
	response.status(201).json({ data: block });
}

export async function unblockUser(request: any, response: any) {
	const blockedId = userIdSchema.parse(request.params.id);
	const result = await blocksService.unblockUser(request.user.id, blockedId);
	response.json({ data: result });
}

export async function listBlocked(request: any, response: any) {
	const blocks = await blocksService.listBlocked(request.user.id);
	response.json({ data: blocks });
}
