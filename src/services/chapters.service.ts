import { ApiError } from '../utils/ApiError';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as panelsRepository from '../repositories/panels.repository';
import { enqueueNotifyFollowers } from '../jobs/notifyFollowers.job';
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

	return story;
}

async function requireChapter(chapterId: string) {
	const chapter = await chaptersRepository.findChapter(chapterId);

	if (!chapter) {
		throw new ApiError(404, 'Chapter not found');
	}

	return chapter;
}

async function attachPanelMetadata(chapters: Array<Record<string, unknown>>) {
	const comicChapterIds = chapters
		.filter((chapter) => chapter.content_type === 'comic')
		.map((chapter) => chapter.id as string);

	if (comicChapterIds.length === 0) {
		return chapters;
	}

	const counts = await panelsRepository.countPanelsByChapterIds(comicChapterIds);

	return chapters.map((chapter) => (
		chapter.content_type === 'comic'
			? { ...chapter, panel_count: counts[chapter.id as string] ?? 0 }
			: chapter
	));
}

async function attachChapterPanels(chapter: Record<string, unknown>, userId?: string) {
	if (chapter.content_type !== 'comic') {
		return chapter;
	}

	if (chapter.status !== 'published') {
		const story = await chaptersRepository.findStoryOwner(chapter.story_id as string);

		if (!story || story.author_id !== userId) {
			return { ...chapter, panels: [] };
		}
	}

	const panels = await panelsRepository.listPanels(chapter.id as string);
	return { ...chapter, panels, panel_count: panels.length };
}

async function validateComicPublish(chapterId: string) {
	const panelCount = await panelsRepository.countPanels(chapterId);

	if (panelCount === 0) {
		throw new ApiError(400, 'Comic chapters must have at least one panel before publishing');
	}
}

export async function listChapters(storyId: string, userId?: string) {
	const story = await chaptersRepository.findStoryOwner(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	const chapters = await chaptersRepository.listChapters(storyId);
	const visible = story.author_id === userId
		? chapters
		: chapters.filter((chapter: { status: string }) => chapter.status === 'published');

	return attachPanelMetadata(visible);
}

export async function getChapter(chapterId: string, userId?: string) {
	const chapter = await requireChapter(chapterId);

	if (chapter.status === 'published') {
		return attachChapterPanels(chapter, userId);
	}

	const story = await chaptersRepository.findStoryOwner(chapter.story_id);

	if (!story || story.author_id !== userId) {
		throw new ApiError(404, 'Chapter not found');
	}

	return attachChapterPanels(chapter, userId);
}

export async function createChapter(storyId: string, userId: string, input: CreateChapterInput) {
	const story = await requireStoryAuthor(storyId, userId);
	const status = input.status ?? 'draft';
	const contentType = input.content_type ?? (story.content_type === 'comic' ? 'comic' : 'text');

	if (story.content_type === 'text' && contentType === 'comic') {
		throw new ApiError(400, 'Cannot add comic chapters to a text story');
	}

	if (story.content_type === 'comic' && contentType === 'text') {
		throw new ApiError(400, 'Cannot add text chapters to a comic story');
	}

	const chapter = await chaptersRepository.createChapter({
		story_id: storyId,
		title: input.title,
		content: contentType === 'comic' ? '' : (input.content ?? ''),
		content_type: contentType,
		status,
		chapter_order: await chaptersRepository.findNextChapterOrder(storyId),
		published_at: status === 'published' ? new Date().toISOString() : null,
	});

	if (status === 'published' && contentType === 'comic') {
		await validateComicPublish(chapter.id);
	}

	if (status === 'published') {
		enqueueNotifyFollowers({
			type: 'chapter_published',
			authorId: userId,
			storyId,
			chapterId: chapter.id,
			chapterTitle: chapter.title,
		});
	}

	return contentType === 'comic'
		? { ...chapter, panel_count: 0, panels: [] }
		: chapter;
}

export async function updateChapter(chapterId: string, userId: string, input: UpdateChapterInput) {
	const chapter = await requireChapter(chapterId);
	const story = await requireStoryAuthor(chapter.story_id, userId);
	const update: Record<string, unknown> = { ...input };
	const publishing = input.status === 'published' && chapter.status !== 'published';
	const contentType = (input.content_type ?? chapter.content_type ?? story.content_type ?? 'text') as 'text' | 'comic';

	if (input.content_type && input.content_type !== chapter.content_type) {
		throw new ApiError(400, 'Chapter content type cannot be changed after creation');
	}

	if (contentType === 'comic' && input.content !== undefined && input.content.trim().length > 0) {
		throw new ApiError(400, 'Comic chapters store content in panels, not text');
	}

	if (contentType === 'comic') {
		update.content = '';
	}

	if (publishing && contentType === 'comic') {
		await validateComicPublish(chapterId);
	}

	if (publishing) {
		update.published_at = new Date().toISOString();
	}

	if (input.status === 'draft') {
		update.published_at = null;
	}

	const updated = await chaptersRepository.updateChapter(chapterId, update);

	if (publishing) {
		enqueueNotifyFollowers({
			type: 'chapter_published',
			authorId: userId,
			storyId: chapter.story_id,
			chapterId,
			chapterTitle: updated.title ?? chapter.title,
		});
	}

	return attachChapterPanels(updated, userId);
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

export async function getAutosave(chapterId: string, userId: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	return chaptersRepository.getAutosave(chapterId);
}

export async function saveAutosave(chapterId: string, userId: string, content: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	return chaptersRepository.saveAutosave(chapterId, content);
}
