import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
// Keep these service tests completely offline, even if a developer has real .env credentials.
process.env.SUPABASE_URL='http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY='test-only';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.REDIS_URL='';
const repository=require('../src/repositories/discovery.repository');
const service=require('../src/services/discovery.service');
const controller=require('../src/controllers/discovery.controller');
const { ApiError }=require('../src/utils/ApiError');
const date=new Date().toISOString();
const pool=Array.from({length:60},(_,i)=>repository.normalizeCandidate({id:`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`,author_id:`author${i}`,title:`Story ${i}`,description:'Synopsis',cover_url:'https://example.test/cover',genre:i%2?'Fantasy':'Romance',tags:[],status:'published',created_at:date,updated_at:date,view_count:0,author:{id:`author${i}`,username:`author${i}`,display_name:null,avatar_url:null},metrics:{},published_at:date,last_chapter_published_at:date,visibility:'public',moderation_status:'approved',is_mature:false,is_complete:false,chapters_published:1,author_active:true,trending_score:0,rising_score:0,quality_score:0,hidden_gem_score:0}));
const ctx={signals:[],followed:[],blocked:new Set<string>(),hidden:new Set<string>(),consumed:new Set<string>(),preferences:{genres:[],tags:[],allowMature:false}};
let savedEvents:any[]=[];
mock.method(repository,'context',async()=>ctx);
mock.method(repository,'globalIds',async()=>pool.map(s=>s.id));
mock.method(repository,'genres',async()=>[{name:'Fantasy',slug:'fantasy'},{name:'Romance',slug:'romance'}]);
mock.method(repository,'interestIds',async()=>[]);
mock.method(repository,'collaborative',async()=>[]);
mock.method(repository,'hydrate',async(ids:string[])=>pool.filter(s=>ids.includes(s.id)&&s.status==='published'));
mock.method(repository,'recordEvents',async(_user:string,events:any[])=>{savedEvents=events;});

test('pagination keeps stable ordering, positions and no repeats while rechecking blocks',async()=>{
  const response=await service.discover('reader',5);
  assert.equal(response.userPersonalized,false);
  const shelf=response.shelves.find((s:any)=>s.id==='for_you');
  assert.ok(shelf.nextCursor);
  const decoded=service.decodeCursor(shelf.nextCursor);
  assert.equal(decoded.offset,5);
  const session=await service.getSession(response.recommendationSessionId,'reader');
  const blockedId=session.ordered.for_you[5];
  ctx.blocked.add(pool.find(s=>s.id===blockedId).author_id);
  const next=await service.loadMore(shelf.nextCursor,'reader',5);
  const second=next.shelves[0];
  assert.equal(second.stories.length,5);
  assert.ok(!second.stories.some((s:any)=>s.id===blockedId));
  assert.ok(!second.stories.some((s:any)=>shelf.stories.some((first:any)=>first.id===s.id)));
  for(const s of second.stories) assert.equal(session.ordered.for_you[second.positions[s.id]],s.id);
  ctx.blocked.clear();
});
test('session cursors cannot be shared between users',async()=>{
  const response=await service.discover('alice',5);
  await assert.rejects(()=>service.loadMore(response.shelves[0].nextCursor,'bob'),(e:any)=>e.statusCode===410);
  await assert.rejects(()=>service.loadMore(response.shelves[0].nextCursor),(e:any)=>e.statusCode===410);
});
test('invalid and expired cursors fail explicitly',async()=>{
  assert.throws(()=>service.decodeCursor('broken'),(e:any)=>e.statusCode===400);
  assert.throws(()=>service.decodeCursor(service.encodeCursor('00000000-0000-4000-8000-000000000000','for_you',-1)),(e:any)=>e.statusCode===400);
  await assert.rejects(()=>service.loadMore(service.encodeCursor('00000000-0000-4000-8000-000000000000','for_you',1)),(e:any)=>e.statusCode===410);
});
test('load more ends with a null cursor',async()=>{
  const response=await service.discover(undefined,5);
  const id=response.recommendationSessionId;
  const session=await service.getSession(id);
  const result=await service.loadMore(service.encodeCursor(id,'for_you',session.ordered.for_you.length-1),undefined,5);
  assert.equal(result.shelves[0].stories.length,1);
  assert.equal(result.shelves[0].nextCursor,null);
});
test('telemetry is checked against session membership and ranking positions',async()=>{
  const response=await service.discover(undefined,5);
  const shelf=response.shelves[0],story=shelf.stories[0];
  await service.track(undefined,{sessionId:response.recommendationSessionId,events:[{event:'story_click',shelf:shelf.id,storyId:story.id,position:shelf.positions[story.id]}]});
  assert.equal(savedEvents[0].metadata.source,'discovery');
  assert.equal(savedEvents[0].metadata.sessionId,response.recommendationSessionId);
  await assert.rejects(()=>service.track(undefined,{sessionId:response.recommendationSessionId,events:[{event:'story_click',shelf:shelf.id,storyId:story.id,position:999}]}),(e:any)=>e.statusCode===400);
});
test('controller validates limits and preserves the data envelope',async()=>{
  let response:any,cacheControl:string|undefined;
  await controller.discover({query:{limit:'3'}},{set:(_name:string,value:string)=>{cacheControl=value;},json:(body:any)=>{response=body;}});
  assert.ok(response.data.shelves);
  assert.equal(cacheControl,'private, no-store');
  await assert.rejects(()=>controller.discover({query:{limit:'1000'}},{set:()=>{},json:()=>{}}));
});
