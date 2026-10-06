import * as commentsService from '../services/comments.service';
import {
  commentIdSchema,
  commentsPaginationSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../validators/comments.validator';

export async function listComments(request: any, response: any) {
  const chapterId = commentIdSchema.parse(request.params.id);
  const { limit, offset } = commentsPaginationSchema.parse(request.query);
  const comments = await commentsService.listComments(chapterId, limit, offset);
  response.json({ data: comments, pagination: { limit, offset } });
}

export async function createComment(request: any, response: any) {
  const chapterId = commentIdSchema.parse(request.params.id);
  const input = createCommentSchema.parse(request.body);
  const comment = await commentsService.createComment(chapterId, request.user.id, input);
  response.status(201).json({ data: comment });
}

export async function updateComment(request: any, response: any) {
  const commentId = commentIdSchema.parse(request.params.id);
  const input = updateCommentSchema.parse(request.body);
  const comment = await commentsService.updateComment(commentId, request.user.id, input);
  response.json({ data: comment });
}

export async function deleteComment(request: any, response: any) {
  const commentId = commentIdSchema.parse(request.params.id);
  await commentsService.deleteComment(commentId, request.user.id);
  response.status(204).send();
}
