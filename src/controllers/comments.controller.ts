import * as commentsService from '../services/comments.service';
import { commentsPaginationSchema, createCommentSchema } from '../validators/comments.validator';

export async function listComments(request: any, response: any) {
  const { limit, offset } = commentsPaginationSchema.parse(request.query);
  const comments = await commentsService.listComments(request.params.id, limit, offset);
  response.json({ data: comments, pagination: { limit, offset } });
}

export async function createComment(request: any, response: any) {
  const input = createCommentSchema.parse(request.body);
  const comment = await commentsService.createComment(request.params.id, request.user.id, input);
  response.status(201).json({ data: comment });
}

export async function deleteComment(request: any, response: any) {
  await commentsService.deleteComment(request.params.id, request.user.id);
  response.status(204).send();
}// Comment controller stub.
// TODO: create comments with chapter id and req.user.id only; never accept
// user_id from the request body.
// TODO: expose newest-first pagination and owner-scoped deletion.
