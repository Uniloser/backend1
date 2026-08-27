import * as promotionsService from '../services/promotions.service';
import { createPromotionSchema } from '../validators/promotions.validator';

export async function listMine(request: any, response: any) {
	response.json({ data: await promotionsService.listMine(request.user.id) });
}

export async function create(request: any, response: any) {
	const input = createPromotionSchema.parse(request.body);
	response.status(201).json({ data: await promotionsService.create(request.user.id, input) });
}