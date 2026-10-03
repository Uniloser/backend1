import * as promotionsRepository from '../repositories/promotions.repository';
import { ApiError } from '../utils/ApiError';
import type { CreatePromotionInput } from '../validators/promotions.validator';

export const promotionGemCosts: Record<CreatePromotionInput['duration_days'], number> = {
	1: 5,
	3: 10,
	7: 20,
	14: 40,
};

function getDatabaseError(error: unknown) {
	if (typeof error !== 'object' || error === null) return {};
	const candidate = error as { code?: unknown; message?: unknown };
	return {
		code: typeof candidate.code === 'string' ? candidate.code : undefined,
		message: typeof candidate.message === 'string' ? candidate.message : undefined,
	};
}

export function listMine(authorId: string) {
	return promotionsRepository.listByAuthor(authorId);
}

export async function create(authorId: string, input: CreatePromotionInput) {
	try {
		return await promotionsRepository.createWithGems({
			userId: authorId,
			storyId: input.story_id,
			promotionType: input.promotion_type,
			durationDays: input.duration_days,
			requestKey: input.request_key,
		});
	} catch (error) {
		const databaseError = getDatabaseError(error);
		if (databaseError.message?.includes('create_story_promotion_with_gems')) {
			throw new ApiError(503, 'Promotion setup is incomplete. Apply backend1/sql/story_promotions_gems.sql and try again.');
		}
		if (databaseError.code === 'P0001' && databaseError.message?.includes('Insufficient Gems')) {
			throw new ApiError(409, `You need ${promotionGemCosts[input.duration_days]} Gems for this promotion package.`);
		}
		if (databaseError.code === '42501') {
			throw new ApiError(403, databaseError.message ?? 'You can only promote your own story.');
		}
		if (databaseError.code === 'P0002') {
			throw new ApiError(404, 'Story not found.');
		}
		if (databaseError.code === '22023') {
			throw new ApiError(400, databaseError.message ?? 'Invalid promotion request.');
		}
		throw error;
	}
}
