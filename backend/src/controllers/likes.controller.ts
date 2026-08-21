import * as likesService from '../services/likes.service';
import { storyIdSchema } from '../validators/likes.validator';

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