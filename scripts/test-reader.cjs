const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, console, require(name) {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`)), mocks);
    return require(name);
  } });
  return exports;
}

test('quoted comments accept optional quotes, enforce bounds, and discard spoofed identity', () => {
  const { createCommentSchema } = load('src/validators/comments.validator.ts');
  const parsed = createCommentSchema.parse({ text: ' A thought ', quote: ' A passage ', user_id: 'spoof' });
  assert.equal(parsed.quote, 'A passage');
  assert.equal(parsed.text, 'A thought');
  assert.equal(parsed.user_id, undefined);
  for (const quote of ['', ' ', 'x'.repeat(10001), 123]) assert.equal(createCommentSchema.safeParse({ text: 'Hi', quote }).success, false);
  assert.equal(createCommentSchema.safeParse({ text: 'Hi' }).success, true);
  assert.equal(createCommentSchema.safeParse({ text: 'Hi', quote: null }).success, true);
});

test('chapter likes are idempotent and return the same liked/count contract for GET, POST and DELETE', async () => {
  const entries = new Set();
  const repo = {
    addChapterLike: async (user, chapter) => entries.add(`${chapter}/${user}`),
    removeChapterLike: async (user, chapter) => entries.delete(`${chapter}/${user}`),
    getChapterLikeState: async (chapter, user) => ({ liked: entries.has(`${chapter}/${user}`), count: entries.size }),
  };
  let chapter = { story_id: 'story', status: 'published' };
  let blocked = false;
  let readable = true;
  const service = load('src/services/likes.service.ts', {
    '../repositories/likes.repository': repo,
    '../repositories/stories.repository': {},
    '../services/notifications.service': {},
    './notifications.service': {},
    '../repositories/chapters.repository': { findChapter: async () => chapter, findStoryOwner: async () => ({ author_id: 'author' }) },
    '../repositories/blocks.repository': { isBlocked: async () => blocked },
    '../discovery/access': { requireReadableStory: async () => { if (!readable) throw Error('Story not found'); } },
  });
  assert.equal((await service.chapterLikeStatus('chapter')).count, 0);
  assert.equal((await service.likeChapter('reader', 'chapter')).liked, true);
  assert.equal((await service.likeChapter('reader', 'chapter')).count, 1);
  assert.equal((await service.chapterLikeStatus('chapter', 'reader')).liked, true);
  assert.equal((await service.unlikeChapter('reader', 'chapter')).count, 0);
  assert.equal((await service.unlikeChapter('reader', 'chapter')).liked, false);
  blocked = true;
  await assert.rejects(service.likeChapter('reader', 'chapter'), /blocked/);
  assert.equal(entries.size, 0);
  blocked = false;
  chapter.status = 'draft';
  await assert.rejects(service.chapterLikeStatus('chapter', 'reader'), /not found/);
  await service.chapterLikeStatus('chapter', 'author');
  readable = false;
  await assert.rejects(service.likeChapter('author', 'chapter'), /not found/);
  chapter = null;
  await assert.rejects(service.likeChapter('reader', 'missing'), /not found/);
});

test('comment service preserves the quote and uses authenticated identity', async () => {
  let saved;
  const service = load('src/services/comments.service.ts', {
    '../repositories/comments.repository': { create: async input => { saved = input; return { id: 'comment', quote: input.quoted_text }; } },
    '../repositories/chapters.repository': { findChapter: async () => ({ story_id: 'story', status: 'published' }), findStoryOwner: async () => ({ author_id: 'author' }) },
    '../repositories/blocks.repository': { isBlocked: async () => false },
    './notifications.service': { notifyComment: async () => {} },
    '../discovery/access': { requireReadableStory: async () => {} },
  });
  const comment = await service.createComment('source-chapter', 'reader', { text: 'Thought', quote: 'Selected words' });
  assert.equal(saved.chapter_id, 'source-chapter');
  assert.equal(saved.user_id, 'reader');
  assert.equal(saved.quoted_text, 'Selected words');
  assert.equal(comment.quote, 'Selected words');
});

test('comment reads and writes return the quote alias and commenter profile', async () => {
  const operations = [];
  const query = new Proxy({}, { get(_, key) {
    if (key === 'then') return resolve => resolve({ data: [], error: null });
    return (...args) => { operations.push([key, ...args]); return query; };
  } });
  const repo = load('src/repositories/comments.repository.ts', { '../config/supabase': { getSupabaseAdmin: () => ({ from: () => query }) } });
  await repo.create({ chapter_id: 'chapter', user_id: 'user', text: 'Thought', quoted_text: 'Quote' });
  await repo.listByChapter('chapter', 20, 0);
  const selects = operations.filter(([operation]) => operation === 'select');
  assert.equal(selects.length, 2);
  for (const [, columns] of selects) { assert.match(columns, /quote:quoted_text/); assert.match(columns, /user:users/); }
});

test('chapter like writes require auth and GET supports optional auth', () => {
  const routes = [];
  const router = {};
  for (const method of ['get', 'post', 'patch', 'delete']) router[method] = (...args) => routes.push({ method, args });
  const auth = () => {}, optionalAuth = () => {};
  load('src/routes/chapters.routes.ts', {
    express: { Router: () => router },
    '../middleware/auth.middleware': { auth, optionalAuth },
    '../controllers/chapters.controller': {},
    '../controllers/likes.controller': { chapterLikeStatus() {}, likeChapter() {}, unlikeChapter() {} },
    '../utils/asyncHandler': { asyncHandler: handler => handler },
  });
  const likes = routes.filter(route => route.args[0] === '/chapters/:id/like');
  assert.equal(likes.length, 3);
  for (const { method, args } of likes) assert.equal(args[1], method === 'get' ? optionalAuth : auth);
});
