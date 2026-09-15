import * as likesRepository from '../repositories/likes.repository';
import * as storiesRepository from '../repositories/stories.repository';
import * as notificationsService from './notifications.service';
import { isBlocked } from '../repositories/blocks.repository';
import { ApiError } from '../utils/ApiError';

export async function likeStory(userId: string, storyId: string) {
  const story = await storiesRepository.findStory(storyId);
  if (!story) throw new ApiError(404, 'Story not found');
  if (await isBlocked(story.author_id, userId) || await isBlocked(userId, story.author_id)) throw new ApiError(403, 'Likes are unavailable between blocked accounts.');
  const like = await likesRepository.addLike(userId, storyId);

  if (story?.author_id) {
    void notificationsService
      .notifyLike(story.author_id, userId, storyId, story.title)
      .catch((error) => console.error('like notification failed', error));
  }

  return { liked: true, like };
}

export async function unlikeStory(userId: string, storyId: string) {
  await likesRepository.removeLike(userId, storyId);
  return { liked: false };
}
