import * as likesRepository from '../repositories/likes.repository';
import * as storiesRepository from '../repositories/stories.repository';
import * as notificationsService from './notifications.service';

export async function likeStory(userId: string, storyId: string) {
  const like = await likesRepository.addLike(userId, storyId);
  const story = await storiesRepository.findStory(storyId);

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