import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildProfile, hiddenGemScore, qualityScore, recommendationScore, risingScore, trendingScore } from '../src/discovery/ranking';
import { diversify, isStoryEligibleForDiscovery, storyCard } from '../src/discovery/filters';
import { assemble } from '../src/discovery/assemble';
import type { Candidate, Metrics, Signal } from '../src/discovery/types';
const now=Date.parse('2026-09-22T00:00:00Z');
const date=(days=0)=>new Date(now-days*86400000).toISOString();
const metrics=(patch:Partial<Metrics>={}):Metrics=>({unique_readers:100,readers_7d:50,readers_previous_7d:20,reads_lifetime:200,reads_24h:10,reads_7d:60,reads_30d:150,likes:30,likes_7d:10,likes_30d:20,bookmarks:20,bookmarks_7d:10,bookmarks_30d:15,comments:10,comments_7d:5,comments_30d:10,followers:10,followers_7d:2,chapters_published:3,completion_rate:0.5,retention_rate:0.6,retention_3_rate:0.4,average_progress:0.5,published_at:date(20),last_chapter_published_at:date(1),last_activity_at:date(1),...patch});
const story=(id:string,patch:Partial<Candidate>={}):Candidate=>({id,author_id:`author-${id}`,title:id,description:'A story',cover_url:'https://example.test/cover',genre:'Fantasy',tags:['magic'],status:'published',created_at:date(20),updated_at:date(),view_count:200,author:{id:`author-${id}`,username:id,display_name:null,avatar_url:null},metrics:metrics(),published_at:date(20),last_chapter_published_at:date(1),visibility:'public',moderation_status:'approved',is_mature:false,is_complete:false,chapters_published:3,author_active:true,trending_score:1,rising_score:1,quality_score:0.5,hidden_gem_score:0.5,...patch});
const signal=(patch:Partial<Signal>={}):Signal=>({story_id:'read',genre:'Fantasy',tags:['magic'],author_id:'author-read',title:'Read',opened:true,chapters_read:2,liked:false,bookmarked:false,completed:false,started:true,abandoned:false,occurred_at:date(),...patch});
const profile=(signals:Signal[]=[])=>buildProfile(signals,[],{genres:[],tags:[],allowMature:false},now);
const options={blocked:new Set<string>(),hidden:new Set<string>(),allowMature:false,limit:15,now,genreNames:['Fantasy','Romance'],similar:new Map<string,number>()};

test('eligibility rejects drafts, private, hidden, banned, chapterless and inactive authors',()=>{
  assert.equal(isStoryEligibleForDiscovery(story('ok')),true);
  for(const patch of [{status:'draft'},{visibility:'private'},{visibility:'unlisted'},{moderation_status:'hidden'},{moderation_status:'pending'},{moderation_status:'banned'},{chapters_published:0},{author_active:false}]) assert.equal(isStoryEligibleForDiscovery(story('bad',patch as Partial<Candidate>)),false);
});
test('blocks and mature preferences apply to every shelf',()=>{
  assert.equal(isStoryEligibleForDiscovery(story('a'),new Set(['author-a'])),false);
  assert.equal(isStoryEligibleForDiscovery(story('a',{is_mature:true})),false);
  assert.equal(isStoryEligibleForDiscovery(story('a',{is_mature:true}),new Set(),true),true);
  const result=assemble([story('a'),story('b',{is_mature:true}),story('c')],profile(),new Map(),{...options,blocked:new Set(['author-a']),hidden:new Set(['c'])});
  assert.equal(result.shelves.length,0);
});
test('trending favors 900 recent readers over 100000 lifetime reads',()=>{
  assert.ok(trendingScore(metrics({unique_readers:2000,readers_7d:900}),now)>trendingScore(metrics({unique_readers:100000,reads_lifetime:100000,readers_7d:5}),now));
});
test('trending decays inactive stories',()=>assert.ok(trendingScore(metrics({last_activity_at:date()}),now)>trendingScore(metrics({last_activity_at:date(30)}),now)));
test('rising requires recent publication and minimum readers',()=>{
  assert.equal(risingScore(metrics({published_at:date(91)}),now),0);
  assert.equal(risingScore(metrics({readers_7d:1,readers_previous_7d:0}),now),0);
  assert.ok(risingScore(metrics({readers_previous_7d:1}),now)>risingScore(metrics({readers_previous_7d:500}),now));
});
test('hidden gems reject tiny perfect samples and high-exposure stories',()=>{
  assert.equal(hiddenGemScore(metrics({unique_readers:2,likes:2,completion_rate:1})),0);
  assert.ok(hiddenGemScore(metrics({unique_readers:300,likes:120,bookmarks:100}))>0);
  assert.equal(hiddenGemScore(metrics({unique_readers:5000})),0);
  assert.ok(qualityScore(metrics({comments:999999}))<=1);
});
test('strong and recent actions outweigh old opens',()=>{
  const weak=profile([signal({chapters_read:0,started:false,occurred_at:date(180)})]);
  const strong=profile([signal({bookmarked:true,liked:true,completed:true})]);
  assert.ok(strong.genres.fantasy>weak.genres.fantasy);
  assert.ok(strong.genres.fantasy<1);
});
test('selected interests personalize cold start',()=>{
  const p=buildProfile([],[],{genres:['Romance'],tags:[],allowMature:false},now);
  assert.equal(p.personalized,true);
  assert.ok(recommendationScore(story('r',{genre:'Romance'}),p,0,now)>recommendationScore(story('f'),p,0,now));
});
test('collaborative and author signals increase relevance',()=>{
  const p=profile([signal()]);
  assert.ok(recommendationScore(story('a'),p,1,now)>recommendationScore(story('a'),p,0,now));
  const followed=buildProfile([],['author-a'],{genres:[],tags:[],allowMature:false},now);
  assert.ok(recommendationScore(story('a'),followed,0,now)>recommendationScore(story('b'),followed,0,now));
});
test('empty data produces no fake shelves',()=>assert.deepEqual(assemble([],profile(),new Map(),options).shelves,[]));
test('small catalogs reuse sparingly without duplicating stories within shelves',()=>{
  const result=assemble([story('one'),story('two')],profile(),new Map(),options);
  assert.ok(result.shelves.length>1);
  for(const s of result.shelves) assert.equal(new Set(s.stories.map(x=>x.id)).size,s.stories.length);
  assert.ok(!result.shelves.some(s=>s.type==='genre'));
});
test('completed/current reading excluded from For You but retained in updates',()=>{
  const result=assemble([story('read'),story('new')],profile([signal({completed:true})]),new Map(),options);
  assert.ok(!result.shelves.find(s=>s.type==='for_you')?.stories.some(s=>s.id==='read'));
  assert.ok(result.shelves.find(s=>s.type==='recently_updated')?.stories.some(s=>s.id==='read'));
});
test('new stories with no engagement get controlled exploration',()=>{
  const pool=Array.from({length:40},(_,i)=>story(String(i),{genre:i%2?'Fantasy':'Romance'}));
  pool.push(story('newcomer',{published_at:date(),metrics:metrics({unique_readers:0,readers_7d:0,likes:0,bookmarks:0,comments:0})}));
  const first=assemble(pool,profile(),new Map(),options).shelves[0];
  assert.ok(first.stories.some(s=>s.id==='newcomer'));
  assert.equal(first.stories.length,15);
});
test('per-author caps stay strict and genre diversity is applied when possible',()=>{
  const pool=Array.from({length:30},(_,i)=>story(String(i),{author_id:i<10?'same':`a${i}`,genre:i<15?'Fantasy':'Romance'}));
  const selected=diversify(pool,15);
  assert.ok(selected.filter(s=>s.author_id==='same').length<=2);
  assert.ok(selected.some(s=>s.genre==='Romance'));
});
test('large catalogs avoid cross-shelf duplicates',()=>{
  const pool=Array.from({length:180},(_,i)=>story(String(i),{genre:i%2?'Fantasy':'Romance'}));
  const result=assemble(pool,profile(),new Map(),options);
  const ids=result.shelves.flatMap(s=>s.stories.map(s=>s.id));
  assert.equal(new Set(ids).size,ids.length);
});
test('because-you-read requires a meaningful available source and enough candidates',()=>{
  const pool=[story('read'),story('a'),story('b'),story('c')];
  assert.ok(!assemble(pool,profile([signal({chapters_read:0,started:false})]),new Map(),options).shelves.some(s=>s.type==='because_you_read'));
  assert.ok(assemble(pool,profile([signal({liked:true})]),new Map(),options).shelves.some(s=>s.sourceStory?.id==='read'));
  assert.ok(!assemble(pool,profile([signal({liked:true})]),new Map(),{...options,hidden:new Set(['read'])}).shelves.some(s=>s.type==='because_you_read'));
});
test('recently updated uses chapter publication, not story creation',()=>{
  const result=assemble([story('old',{created_at:date(500),last_chapter_published_at:date()}),story('new',{created_at:date(),last_chapter_published_at:date(10)})],profile(),new Map(),options);
  assert.equal(result.shelves.find(s=>s.type==='recently_updated')!.stories[0].id,'old');
});
test('story DTO excludes ranking and private eligibility metadata',()=>{
  const card=storyCard(story('a'));
  assert.ok(!('metrics' in card)); assert.ok(!('trending_score' in card)); assert.ok(!('moderation_status' in card));
});
