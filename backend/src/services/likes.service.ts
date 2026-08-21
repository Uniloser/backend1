import * as likesRepository from '../repositories/likes.repository';

export async function likeStory(userId: string, storyId: string) {
  const like = await likesRepository.addLike(userId, storyId);
  return { liked: true, like };
}

export async function unlikeStory(userId: string, storyId: string) {
  await likesRepository.removeLike(userId, storyId);
  return { liked: false };
}