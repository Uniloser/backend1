import * as promotionsRepository from '../repositories/promotions.repository';
import * as storiesRepository from '../repositories/stories.repository';
import { ApiError } from '../utils/ApiError';
import type { CreatePromotionInput } from '../validators/promotions.validator';

export function listMine(authorId: string) {
	return promotionsRepository.listByAuthor(authorId);
}

export async function create(authorId: string, input: CreatePromotionInput) {
	const story = await storiesRepository.findStory(input.story_id);
	if (!story || story.author_id !== authorId) throw new ApiError(404, 'Story not found');
	if (story.status !== 'published') throw new ApiError(400, 'Only published stories can be promoted');
	if (!story.cover_url) throw new ApiError(400, 'A story needs a cover before it can be promoted');

	return promotionsRepository.create({
		author_id: authorId,
		story_id: story.id,
		title: story.title,
		description: story.description ?? `Discover ${story.title}.`,
		image_url: story.cover_url,
		button_text: 'Read story',
		promotion_type: input.promotion_type,
		status: 'active',
		budget: input.budget,
		spent: 0,
		starts_at: new Date().toISOString(),
		ends_at: new Date(Date.now() + input.duration_days * 86400000).toISOString(),
		is_active: true,
	});
}