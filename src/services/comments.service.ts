import * as commentsRepository from '../repositories/comments.repository';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as notificationsService from './notifications.service';
import { ApiError } from '../utils/ApiError';
import type { CreateCommentInput } from '../validators/comments.validator';

export function listComments(chapterId: string, limit: number, offset: number) {
  return commentsRepository.listByChapter(chapterId, limit, offset);
}

export async function createComment(chapterId: string, userId: string, input: CreateCommentInput) {
  const comment = await commentsRepository.create({ chapter_id: chapterId, user_id: userId, text: input.text });
  const chapter = await chaptersRepository.findChapter(chapterId);
  const story = chapter ? await chaptersRepository.findStoryOwner(chapter.story_id) : null;

  if (story?.author_id && chapter) {
    void notificationsService
      .notifyComment(story.author_id, userId, chapter.story_id, chapterId, comment.id)
      .catch((error) => console.error('comment notification failed', error));
  }

  return comment;
}

export async function deleteComment(commentId: string, userId: string) {
  const deleted = await commentsRepository.deleteById(commentId, userId);

  if (!deleted) {
    throw new ApiError(404, 'Comment not found');
  }
}// Comment service stub.
// TODO: enforce authenticated ownership on create/delete, validate chapter
// visibility, and provide newest-first pagination.
