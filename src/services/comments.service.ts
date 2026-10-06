import * as commentsRepository from '../repositories/comments.repository';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as notificationsService from './notifications.service';
import { ApiError } from '../utils/ApiError';
import type { CreateCommentInput, UpdateCommentInput } from '../validators/comments.validator';
import { isBlocked } from '../repositories/blocks.repository';
import { requireReadableStory } from '../discovery/access';

export function listComments(chapterId: string, limit: number, offset: number) {
  return commentsRepository.listByChapter(chapterId, limit, offset);
}

export async function createComment(chapterId: string, userId: string, input: CreateCommentInput) {
  const chapter = await chaptersRepository.findChapter(chapterId);
  const story = chapter ? await chaptersRepository.findStoryOwner(chapter.story_id) : null;
  if (!story || !chapter) throw new ApiError(404, 'Chapter not found');
  await requireReadableStory(chapter.story_id, userId);
  if (chapter.status !== 'published' && story.author_id !== userId) throw new ApiError(404, 'Chapter not found');
  if (await isBlocked(story.author_id, userId) || await isBlocked(userId, story.author_id)) throw new ApiError(403, 'Comments are unavailable between blocked accounts.');
  if (input.parent_comment_id) {
    const parent = await commentsRepository.findById(input.parent_comment_id);
    if (!parent || parent.chapter_id !== chapterId) {
      throw new ApiError(400, 'Reply target is unavailable.');
    }
    if (await isBlocked(parent.user_id, userId) || await isBlocked(userId, parent.user_id)) {
      throw new ApiError(403, 'Replies are unavailable between blocked accounts.');
    }
  }
  const comment = await commentsRepository.create({
    chapter_id: chapterId,
    user_id: userId,
    text: input.text,
    quoted_text: input.quote ?? null,
    parent_comment_id: input.parent_comment_id ?? null,
  });

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
}

export async function updateComment(commentId: string, userId: string, input: UpdateCommentInput) {
  const updated = await commentsRepository.updateById(commentId, userId, {
    text: input.text,
    ...(input.quote !== undefined ? { quoted_text: input.quote } : {}),
  });

  if (!updated) {
    throw new ApiError(404, 'Comment not found');
  }

  return updated;
}
