import * as chaptersService from '../services/chapters.service';
import {
	createChapterSchema,
	reorderChaptersSchema,
	updateChapterSchema,
} from '../validators/chapters.schema';

export async function listChapters(request: any, response: any) {
	const chapters = await chaptersService.listChapters(request.params.storyId, request.user?.id);
	response.json({ data: chapters });
}

export async function getChapter(request: any, response: any) {
	const chapter = await chaptersService.getChapter(request.params.id, request.user?.id);
	response.json({ data: chapter });
}

export async function createChapter(request: any, response: any) {
	const input = createChapterSchema.parse(request.body);
	const chapter = await chaptersService.createChapter(request.params.storyId, request.user.id, input);
	response.status(201).json({ data: chapter });
}

export async function updateChapter(request: any, response: any) {
	const input = updateChapterSchema.parse(request.body);
	const chapter = await chaptersService.updateChapter(request.params.id, request.user.id, input);
	response.json({ data: chapter });
}

export async function deleteChapter(request: any, response: any) {
	await chaptersService.deleteChapter(request.params.id, request.user.id);
	response.status(204).send();
}

export async function reorderChapters(request: any, response: any) {
	const input = reorderChaptersSchema.parse(request.body);
	await chaptersService.reorderChapters(request.params.storyId, request.user.id, input);
	response.status(204).send();
}
// Chapter controller stub.
// TODO: validate chapter payloads and reorder arrays, then delegate ownership,
// next-order assignment, publication timestamps, and resequencing to services.
