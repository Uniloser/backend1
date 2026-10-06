import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  commentsPaginationSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../src/validators/comments.validator';

const commentId = '5bfb08f4-0d38-4f38-a6a2-8b34dcc32b52';

test('chapter comments accept a valid reply parent but not malformed IDs', () => {
  assert.deepEqual(createCommentSchema.parse({
    text: '  A reply  ',
    parent_comment_id: commentId,
  }), {
    text: 'A reply',
    parent_comment_id: commentId,
  });
  assert.equal(createCommentSchema.safeParse({
    text: 'A reply',
    parent_comment_id: 'not-a-uuid',
  }).success, false);
});

test('comment updates validate content and allow clearing a quote', () => {
  assert.deepEqual(updateCommentSchema.parse({ text: 'Updated', quote: null }), {
    text: 'Updated',
    quote: null,
  });
  assert.equal(updateCommentSchema.safeParse({ text: '   ' }).success, false);
});

test('comment pagination applies safe defaults and bounds', () => {
  assert.deepEqual(commentsPaginationSchema.parse({}), { limit: 20, offset: 0 });
  assert.deepEqual(commentsPaginationSchema.parse({ limit: '30', offset: '60' }), {
    limit: 30,
    offset: 60,
  });
  assert.equal(commentsPaginationSchema.safeParse({ limit: 101 }).success, false);
});
