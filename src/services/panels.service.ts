import { ApiError } from '../utils/ApiError';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as panelsRepository from '../repositories/panels.repository';
import type {
	CreatePanelInput,
	ReorderPanelsInput,
	UpdatePanelInput,
} from '../validators/panels.schema';

async function requireComicChapterAuthor(chapterId: string, userId: string) {
	const chapter = await chaptersRepository.findChapter(chapterId);

	if (!chapter) {
		throw new ApiError(404, 'Chapter not found');
	}

	const story = await chaptersRepository.findStoryOwner(chapter.story_id);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	if (story.author_id !== userId) {
		throw new ApiError(403, 'Only the story author can manage panels');
	}

	if (chapter.content_type !== 'comic') {
		throw new ApiError(400, 'Panels can only be added to comic chapters');
	}

	return chapter;
}

async function requireReadableComicChapter(chapterId: string, userId?: string) {
	const chapter = await chaptersRepository.findChapter(chapterId);

	if (!chapter) {
		throw new ApiError(404, 'Chapter not found');
	}

	if (chapter.content_type !== 'comic') {
		throw new ApiError(400, 'This chapter is not a comic chapter');
	}

	if (chapter.status === 'published') {
		return chapter;
	}

	const story = await chaptersRepository.findStoryOwner(chapter.story_id);

	if (!story || story.author_id !== userId) {
		throw new ApiError(404, 'Chapter not found');
	}

	return chapter;
}

export async function listPanels(chapterId: string, userId?: string) {
	await requireReadableComicChapter(chapterId, userId);
	return panelsRepository.listPanels(chapterId);
}

export async function createPanel(chapterId: string, userId: string, input: CreatePanelInput) {
	await requireComicChapterAuthor(chapterId, userId);

	return panelsRepository.createPanel({
		chapter_id: chapterId,
		panel_order: await panelsRepository.findNextPanelOrder(chapterId),
		image_url: input.image_url,
		width: input.width ?? null,
		height: input.height ?? null,
	});
}

export async function updatePanel(panelId: string, userId: string, input: UpdatePanelInput) {
	const panel = await panelsRepository.findPanel(panelId);

	if (!panel) {
		throw new ApiError(404, 'Panel not found');
	}

	await requireComicChapterAuthor(panel.chapter_id, userId);
	return panelsRepository.updatePanel(panelId, input);
}

export async function deletePanel(panelId: string, userId: string) {
	const panel = await panelsRepository.findPanel(panelId);

	if (!panel) {
		throw new ApiError(404, 'Panel not found');
	}

	await requireComicChapterAuthor(panel.chapter_id, userId);
	await panelsRepository.deletePanel(panelId);
	await panelsRepository.resequencePanels(panel.chapter_id);
}

export async function reorderPanels(chapterId: string, userId: string, input: ReorderPanelsInput) {
	await requireComicChapterAuthor(chapterId, userId);

	const existing = await panelsRepository.listPanels(chapterId);
	const existingIds = new Set(existing.map((panel: { id: string }) => panel.id));
	const orders = input.panels.map((panel) => panel.panel_order);

	if (input.panels.length !== existing.length) {
		throw new ApiError(400, 'Reorder payload must include every panel in the chapter');
	}

	if (new Set(orders).size !== orders.length) {
		throw new ApiError(400, 'Panel orders must be unique');
	}

	for (const panel of input.panels) {
		if (!existingIds.has(panel.id)) {
			throw new ApiError(400, 'One or more panels do not belong to this chapter');
		}
	}

	await panelsRepository.reorderPanels(chapterId, input.panels);
	return panelsRepository.listPanels(chapterId);
}

export async function countPanelsForChapter(chapterId: string) {
	return panelsRepository.countPanels(chapterId);
}
