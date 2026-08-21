import * as commentsRepository from '../repositories/comments.repository';
import { ApiError } from '../utils/ApiError';
import type { CreateCommentInput } from '../validators/comments.validator';

export function listComments(chapterId: string, limit: number, offset: number) {
  return commentsRepository.listByChapter(chapterId, limit, offset);
}

export function createComment(chapterId: string, userId: string, input: CreateCommentInput) {
  return commentsRepository.create({ chapter_id: chapterId, user_id: userId, text: input.text });
}

export async function deleteComment(commentId: string, userId: string) {
  const deleted = await commentsRepository.deleteById(commentId, userId);

  if (!deleted) {
    throw new ApiError(404, 'Comment not found');
  }
}// Comment service stub.
// TODO: enforce authenticated ownership on create/delete, validate chapter
// visibility, and provide newest-first pagination.
