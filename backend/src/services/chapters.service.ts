import { ApiError } from '../utils/ApiError';
import * as chaptersRepository from '../repositories/chapters.repository';
import type {
	CreateChapterInput,
	ReorderChaptersInput,
	UpdateChapterInput,
} from '../validators/chapters.schema';

async function requireStoryAuthor(storyId: string, userId: string) {
	const story = await chaptersRepository.findStoryOwner(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	if (story.author_id !== userId) {
		throw new ApiError(403, 'Only the story author can manage chapters');
	}
}

async function requireChapter(chapterId: string) {
	const chapter = await chaptersRepository.findChapter(chapterId);

	if (!chapter) {
		throw new ApiError(404, 'Chapter not found');
	}

	return chapter;
}

export async function listChapters(storyId: string, userId?: string) {
	const story = await chaptersRepository.findStoryOwner(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	const chapters = await chaptersRepository.listChapters(storyId);

	if (story.author_id === userId) {
		return chapters;
	}

	return chapters.filter((chapter: { status: string }) => chapter.status === 'published');
}

export async function getChapter(chapterId: string, userId?: string) {
	const chapter = await requireChapter(chapterId);

	if (chapter.status === 'published') {
		return chapter;
	}

	const story = await chaptersRepository.findStoryOwner(chapter.story_id);

	if (!story || story.author_id !== userId) {
		throw new ApiError(404, 'Chapter not found');
	}

	return chapter;
}

export async function createChapter(storyId: string, userId: string, input: CreateChapterInput) {
	await requireStoryAuthor(storyId, userId);
	const status = input.status ?? 'draft';

	return chaptersRepository.createChapter({
		story_id: storyId,
		title: input.title,
		content: input.content,
		status,
		chapter_order: await chaptersRepository.findNextChapterOrder(storyId),
		published_at: status === 'published' ? new Date().toISOString() : null,
	});
}

export async function updateChapter(chapterId: string, userId: string, input: UpdateChapterInput) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	const update: Record<string, unknown> = { ...input };

	if (input.status === 'published' && chapter.status !== 'published') {
		update.published_at = new Date().toISOString();
	}

	if (input.status === 'draft') {
		update.published_at = null;
	}

	return chaptersRepository.updateChapter(chapterId, update);
}

export async function deleteChapter(chapterId: string, userId: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	await chaptersRepository.deleteChapter(chapterId);
	await chaptersRepository.resequenceChapters(chapter.story_id);
}

export async function reorderChapters(storyId: string, userId: string, input: ReorderChaptersInput) {
	await requireStoryAuthor(storyId, userId);
	const orders = input.chapters.map((chapter) => chapter.chapter_order);

	if (new Set(orders).size !== orders.length) {
		throw new ApiError(400, 'Chapter orders must be unique');
	}

	await chaptersRepository.reorderChapters(storyId, input.chapters);
}
// Chapter business-logic stub.
// TODO: enforce story author ownership, published-versus-draft visibility,
// automatic ordering, publication timestamps, and reorder validation.
