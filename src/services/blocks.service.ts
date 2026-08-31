import * as blocksRepository from '../repositories/blocks.repository';
import * as followsRepository from '../repositories/follows.repository';
import * as usersRepository from '../repositories/users.repository';
import { ApiError } from '../utils/ApiError';

export async function blockUser(blockerId: string, blockedId: string) {
	if (blockerId === blockedId) {
		throw new ApiError(400, 'You cannot block yourself');
	}

	const user = await usersRepository.findById(blockedId);
	if (!user) {
		throw new ApiError(404, 'User not found');
	}

	const block = await blocksRepository.blockUser(blockerId, blockedId);

	await Promise.all([
		followsRepository.unfollow(blockerId, blockedId).catch(() => undefined),
		followsRepository.unfollow(blockedId, blockerId).catch(() => undefined),
	]);

	return block;
}

export async function unblockUser(blockerId: string, blockedId: string) {
	if (blockerId === blockedId) {
		throw new ApiError(400, 'You cannot unblock yourself');
	}

	await blocksRepository.unblockUser(blockerId, blockedId);
	return { blocked: false };
}

export function listBlocked(blockerId: string) {
	return blocksRepository.listBlocked(blockerId);
}

export function isBlocked(blockerId: string, blockedId: string) {
	return blocksRepository.isBlocked(blockerId, blockedId);
}
