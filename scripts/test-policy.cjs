// Isolated regression tests. No real database, storage, or accounts are touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const exports = {};
  const context = { exports, require(name) { if (name in mocks) return mocks[name]; if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')), mocks); return require(name); }, console, Set, Date };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return exports;
}
async function main() {
  const terms = load('src/middleware/communityTerms.middleware.ts');
  for (const requestPath of ['/stories', '/chapters/abc/comments', '/uploads/avatar', '/imports', '/users/me']) {
    assert.throws(() => terms.enforceCommunityTerms({ method: 'POST', path: requestPath === '/users/me' ? '/stories' : requestPath, user: { app_metadata: {} } }), /Accept/);
  }
  terms.enforceCommunityTerms({ method: 'POST', path: '/stories', user: { app_metadata: { community_terms_version: terms.COMMUNITY_TERMS_VERSION } } });
  terms.enforceCommunityTerms({ method: 'DELETE', path: '/users/me/account' });
  terms.enforceCommunityTerms({ method: 'POST', path: '/reports' });
  terms.enforceCommunityTerms({ method: 'GET', path: '/stories' });
  const schema = load('src/validators/reports.validator.ts').createReportSchema;
  const id = '12345678-1234-4234-8234-123456789abc';
  assert.equal(schema.safeParse({ category: 'abuse', description: 'Report details', comment_id: id }).success, true);
  assert.equal(schema.safeParse({ category: 'abuse', description: 'Report details', comment_id: id, story_id: id }).success, false);
  assert.equal(schema.safeParse({ category: 'abuse', description: 'Report details', story_id: 'bad' }).success, false);
  for (const failStorage of [false, true]) {
    const deleted = [], events = []; let page = 0;
    const admin = { storage: { from(bucket) { assert.equal(bucket, 'covers'); return {
      async list(prefix) { assert.equal(prefix, id); events.push('list'); return failStorage ? {error: new Error('storage unavailable')} : { data: page++ < 2 ? [{id:'object',name:`${page}.webp`}] : [] }; },
      async remove(files) { assert.ok(files.every(file => file.startsWith(id + '/'))); deleted.push(...files); return {}; },
    }; } }, auth: { admin: { async deleteUser(userId, soft) { assert.equal(userId, id); assert.equal(soft, false); events.push('deleteAuth'); return {}; } } } };
    const account = load('src/repositories/account.repository.ts', { '../config/supabase': {getSupabaseAdmin: () => admin}, '../config/env': {env:{coverBucket:'covers',avatarBucket:'covers',panelBucket:'covers'}}, './imports.repository': {deleteAccountImports: async userId => assert.equal(userId,id)} });
    await assert.rejects(account.deleteAccount('../other-user'), /Invalid/);
    if (failStorage) { await assert.rejects(account.deleteAccount(id), /storage unavailable/); assert.ok(!events.includes('deleteAuth')); }
    else { await account.deleteAccount(id); assert.equal(deleted.length,2); assert.equal(events.at(-1),'deleteAuth'); }
  }
  const routes = {}; const identity = fn => fn;
  let removedId;
  load('src/routes/account.routes.ts', { express:{Router:()=>({delete:(p,...h)=>routes[p]=h.at(-1),post:()=>{}})}, '../middleware/auth.middleware':{auth:identity}, '../middleware/rateLimit.middleware':{authRateLimit:identity}, '../utils/asyncHandler':{asyncHandler:identity}, '../repositories/account.repository':{deleteAccount:async id=>removedId=id} });
  await assert.rejects(routes['/users/me/account']({user:{id},body:{confirmation:'no'}},{}), /Type DELETE/);
  assert.equal(removedId,undefined);
  await routes['/users/me/account']({user:{id},body:{confirmation:'DELETE', userId:'other-user'}},{json:()=>{}});
  assert.equal(removedId,id);
  const moderation = load('src/routes/moderation.routes.ts', {express:{Router:()=>({get(){},patch(){}})}, '../middleware/auth.middleware':{auth:identity}, '../config/supabase':{} });
  let denied; moderation.requireModerator({user:{user_metadata:{role:'admin'}}},{},e=>denied=e); assert.equal(denied.statusCode,403);
  let allowed=false; moderation.requireModerator({user:{app_metadata:{role:'moderator'}}},{},e=>allowed=!e); assert.equal(allowed,true);
  console.log('Passed: consent gates, report validation, deletion confirmation/self scope/pagination/failure, and moderator permissions.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
