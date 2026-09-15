const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file);const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name in mocks)return mocks[name];if(name.startsWith('.'))return load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(filename),name+'.ts')),mocks);return require(name);},console,Set,Map,Date});return exports;}
const id='12345678-1234-4234-8234-123456789abc';const other='22345678-1234-4234-8234-123456789abc';
async function main(){
 const v=load('src/validators/community.validator.ts');
 for(const input of [{content:' '},{content:'x',chapter_id:id},{content:'x',post_type:'chapter'},{content:'x',post_type:'poll'},{content:'x',post_type:'poll',poll_options:['Yes','yes']},{content:'x',story_id:'bad'},{content:'x'.repeat(4001)}])assert.equal(v.communityPostInput.safeParse(input).success,false);
 assert.equal(v.communityPostInput.safeParse({content:'A reading question',post_type:'poll',poll_options:['Yes','No']}).success,true);
 assert.equal(v.communityQuery.safeParse({limit:1000}).success,false);
 assert.equal(v.communityCommentInput.safeParse({content:'Reply',parent_comment_id:'bad'}).success,false);
 const terms=load('src/middleware/communityTerms.middleware.ts');
 for(const route of ['/community/posts','/community/posts/'+id+'/comments','/community/comments/'+id])assert.throws(()=>terms.enforceCommunityTerms({method:'POST',path:route,user:{app_metadata:{}}}),/Accept/);
 terms.enforceCommunityTerms({method:'POST',path:'/community/posts/'+id+'/like',user:{app_metadata:{}}});
 let queue=[],calls=[];
 const admin={from(table){const trace={table,ops:[]};calls.push(trace);const query=new Proxy({}, {get(_,key){if(key==='then')return (resolve,reject)=>Promise.resolve(queue.shift()??{data:[],error:null}).then(resolve,reject);return(...args)=>{trace.ops.push([key,...args]);return query;};}});return query;},rpc(){return Promise.resolve({data:[]});}};
 const repo=load('src/repositories/community.repository.ts',{'../config/supabase':{getSupabaseAdmin:()=>admin},'../config/env':{env:{coverBucket:'covers'}}});
 queue=[{data:{id,user_id:other,story:null,chapter:null}},{data:[{blocker_id:other,blocked_id:id}]}];await assert.rejects(repo.getPost(id,id),/no longer available/);
 queue=[{data:{id,author_id:other,status:'published'}},{data:[]}];await assert.rejects(repo.createPost(id,{content:'x',story_id:id,post_type:'announcement'}),/Only the author/);
 queue=[{data:{id,author_id:id,status:'published'}},{data:[]},{data:null}];await assert.rejects(repo.createPost(id,{content:'x',story_id:id,chapter_id:other}),/belong/);
 queue=[{data:{id,user_id:other,story:null,chapter:null}},{data:[]},{data:null}];await assert.rejects(repo.addComment(id,id,{content:'x',parent_comment_id:other}),/Reply target/);
 calls=[];queue=[{data:null}];await assert.rejects(repo.removePost(id,other),/not found/);assert.ok(calls[0].ops.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]===other));
 calls=[];queue=[{data:null}];await assert.rejects(repo.mutateComment(id,other,'edit'),/not found/);assert.ok(calls[0].ops.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]===other));
 assert.ok(repo.rankPost({user_id:id,like_count:0,comment_count:0},new Set([id]))>repo.rankPost({user_id:other,like_count:0,comment_count:0},new Set([id])));
 // Likes/saves always use a single composite user/post key, and all mutations require auth.
 for(const kind of ['like','save']) {
  calls=[];queue=[{data:{id,user_id:other,story:null,chapter:null}},{data:[]},{data:[]},{data:{id,user_id:other,story:null,chapter:null}},{data:[]}];
  await repo.reaction(id,other,kind,true);
  const write=calls.find(c=>c.table===(kind==='like'?'community_post_likes':'community_post_saves'));
  const op=write.ops.find(o=>o[0]==='upsert');assert.equal(op[1].user_id,other);assert.equal(op[1].post_id,id);assert.equal(op[2].onConflict,'post_id,user_id');
 }
 const routes=[];const auth=()=>{};const optionalAuth=()=>{};const router={};
 for(const method of ['get','post','patch','delete'])router[method]=(...args)=>routes.push({method,args});
 load('src/routes/community.routes.ts',{'express':{Router:()=>router},'express-rate-limit':()=>()=>{},'../middleware/auth.middleware':{auth,optionalAuth},'../utils/asyncHandler':{asyncHandler:fn=>fn},'../repositories/community.repository':repo});
 for(const route of routes.filter(r=>r.method!=='get'))assert.equal(route.args[1],auth);
 assert.ok(routes.some(r=>r.method==='get'&&r.args[0]==='/community/posts/:id'));
 console.log('Passed: input limits, polls, pagination, consent, block checks, announcement ownership, chapter association, reply association, own-post/comment mutations, and ranking.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
