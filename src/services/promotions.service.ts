import * as promotionsRepository from '../repositories/promotions.repository';
import { ApiError } from '../utils/ApiError';
import type { CreatePromotionInput } from '../validators/promotions.validator';

export function listMine(authorId: string) {
	return promotionsRepository.listByAuthor(authorId);
}

export async function create(_authorId: string, _input: CreatePromotionInput) {
	throw new ApiError(503, 'New paid promotions are unavailable until payment processing is supported.');
}
