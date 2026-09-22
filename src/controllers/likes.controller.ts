import * as likesService from '../services/likes.service';
import { chapterIdSchema, storyIdSchema } from '../validators/likes.validator';

export async function chapterLikeStatus(request: any, response: any) {
	response.json({ data: await likesService.chapterLikeStatus(chapterIdSchema.parse(request.params.id), request.user?.id) });
}

export async function likeChapter(request: any, response: any) {
	response.json({ data: await likesService.likeChapter(request.user.id, chapterIdSchema.parse(request.params.id)) });
}

export async function unlikeChapter(request: any, response: any) {
	response.json({ data: await likesService.unlikeChapter(request.user.id, chapterIdSchema.parse(request.params.id)) });
}

export async function likeStory(request: any, response: any) {
  const storyId = storyIdSchema.parse(request.params.id);
  const result = await likesService.likeStory(request.user.id, storyId);
  response.status(201).json({ data: result });
}

export async function unlikeStory(request: any, response: any) {
  const storyId = storyIdSchema.parse(request.params.id);
  const result = await likesService.unlikeStory(request.user.id, storyId);
  response.json({ data: result });
}
