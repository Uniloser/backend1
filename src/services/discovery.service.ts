import * as repository from '../repositories/discovery.repository';
import { DISCOVERY_CONFIG as C } from '../discovery/config';
import { cacheGet, cacheSet } from '../discovery/cache';
import { buildProfile, recommendationScore } from '../discovery/ranking';
import { assemble } from '../discovery/assemble';
import { diversify, isStoryEligibleForDiscovery, storyCard } from '../discovery/filters';
import type { DiscoveryResponse, Shelf, Signal } from '../discovery/types';
import { ApiError } from '../utils/ApiError';
const { randomUUID } = require('node:crypto');
const { Buffer } = require('node:buffer');
type Session = { owner: string | null; generatedAt: string; personalized: boolean; ordered: Record<string,string[]>; shelves: Shelf[] };
const sessionKey = (id: string) => `discovery:session:${id}`;
const meaningful = (s: Signal) => s.chapters_read>=2 || s.liked || s.bookmarked || s.completed;
function normalized(rows: Array<{story_id:string;score:number}>) {
  const max = Math.max(1,...rows.map(r=>r.score)); return new Map(rows.map(r=>[r.story_id,r.score/max]));
}
export function encodeCursor(sessionId: string,shelf: string,offset: number) { return Buffer.from(JSON.stringify({sessionId,shelf,offset})).toString('base64url'); }
export function decodeCursor(cursor: string): {sessionId:string;shelf:string;offset:number} {
  try {
    const value=JSON.parse(Buffer.from(cursor,'base64url').toString());
    if(!/^[0-9a-f-]{36}$/i.test(value.sessionId) || typeof value.shelf!=='string' || value.shelf.length>100 || !Number.isInteger(value.offset) || value.offset<0 || value.offset>C.limits.maxOffset) throw new Error();
    return value;
  } catch { throw new ApiError(400,'Invalid discovery cursor'); }
}
export async function getSession(id: string,userId?: string) {
  const session=await cacheGet<Session>(sessionKey(id));
  if(!session || session.owner!==(userId??null)) throw new ApiError(410,'Discovery session expired. Refresh discovery.');
  return session;
}
export async function discover(userId?: string,limit: number=C.limits.shelf): Promise<DiscoveryResponse> {
  const ctx=await repository.context(userId);
  ctx.signals=ctx.signals.filter(s=>!ctx.blocked.has(s.author_id) && !ctx.hidden.has(s.story_id));
  const profile=buildProfile(ctx.signals,ctx.followed,ctx.preferences);
  for(const id of ctx.consumed) profile.consumed.add(id);
  let global=await cacheGet<string[]>(`discovery:global:${C.version}`);
  if(!global) {
    global=[...new Set((await Promise.all((['trending','rising','hidden_gems','recently_updated','new'] as const).map(repository.globalIds))).flat())];
    await cacheSet(`discovery:global:${C.version}`,global,C.cache.globalSeconds);
  }
  const genres=await repository.genres();
  const topGenres=genres.filter(g=>profile.genres[g.name.toLowerCase()]).sort((a,b)=>(profile.genres[b.name.toLowerCase()]??0)-(profile.genres[a.name.toLowerCase()]??0)).slice(0,C.limits.genreShelves).map(g=>g.name);
  const topTags=Object.entries(profile.tags).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([tag])=>tag);
  const seeds=ctx.signals.filter(meaningful).slice(0,5).map(s=>s.story_id);
  const [interests,collaborative,similar]=await Promise.all([
    repository.interestIds(topGenres,topTags,ctx.followed),repository.collaborative(seeds,userId),repository.collaborative(seeds.slice(0,1),userId),
  ]);
  const pool=await repository.hydrate([...global,...interests,...collaborative.map(r=>r.story_id),...similar.map(r=>r.story_id),...seeds]);
  const now=Date.now();
  const {shelves,ordered}=assemble(pool,profile,normalized(collaborative),{blocked:ctx.blocked,hidden:ctx.hidden,allowMature:ctx.preferences.allowMature,limit,now,genreNames:genres.map(g=>g.name),similar:normalized(similar)});
  const id=randomUUID();
  for(const shelf of shelves) {
    shelf.nextCursor=ordered[shelf.id].length>shelf.stories.length ? encodeCursor(id,shelf.id,shelf.stories.length) : null;
    shelf.positions=Object.fromEntries(shelf.stories.map(s=>[s.id,ordered[shelf.id].indexOf(s.id)]));
  }
  const generatedAt=new Date(now).toISOString();
  await cacheSet(sessionKey(id),{owner:userId??null,generatedAt,personalized:profile.personalized,ordered,shelves} satisfies Session,C.cache.sessionSeconds);
  return {userPersonalized:profile.personalized,generatedAt,recommendationSessionId:id,shelves};
}
export async function loadMore(cursor: string,userId?: string,limit: number=C.limits.shelf) {
  const {sessionId,shelf: id,offset}=decodeCursor(cursor);
  const session=await getSession(sessionId,userId), shelf=session.shelves.find(s=>s.id===id);
  if(!shelf || offset>session.ordered[id].length) throw new ApiError(400,'Invalid discovery shelf cursor');
  const ctx=await repository.context(userId);
  const ids=session.ordered[id];
  const candidates=await repository.hydrate(ids.slice(offset,C.limits.maxOffset));
  const byId=new Map(candidates.map(s=>[s.id,s]));
  const consumed=new Set([...ctx.consumed,...ctx.signals.filter(s=>s.started||s.completed).map(s=>s.story_id)]);
  const selected: typeof candidates=[], authors=new Map<string,number>();
  let next=offset;
  while(next<Math.min(ids.length,C.limits.maxOffset) && selected.length<limit) {
    const s=byId.get(ids[next++]);
    if(!s || !isStoryEligibleForDiscovery(s,ctx.blocked,ctx.preferences.allowMature) || ctx.hidden.has(s.id) || ((shelf.type==='for_you'||shelf.type==='because_you_read')&&consumed.has(s.id))) continue;
    if((authors.get(s.author_id)??0)>=C.limits.maxAuthor) continue;
    authors.set(s.author_id,(authors.get(s.author_id)??0)+1); selected.push(s);
  }
  // Recheck source metadata too: it may have been unpublished or blocked after page one.
  let sourceStory=shelf.sourceStory;
  if(sourceStory) {
    const [source]=await repository.hydrate([sourceStory.id]);
    if(!source || !isStoryEligibleForDiscovery(source,ctx.blocked,ctx.preferences.allowMature) || ctx.hidden.has(source.id)) throw new ApiError(410,'Discovery source is no longer available. Refresh discovery.');
    sourceStory={id:source.id,title:source.title};
  }
  return {userPersonalized:session.personalized,generatedAt:session.generatedAt,recommendationSessionId:sessionId,shelves:[{...shelf,...(sourceStory?{sourceStory,title:`Because You Read ${sourceStory.title}`} : {}),stories:selected.map(storyCard),positions:Object.fromEntries(selected.map(s=>[s.id,ids.indexOf(s.id)])),nextCursor:next<Math.min(ids.length,C.limits.maxOffset)?encodeCursor(sessionId,id,next):null}]};
}
export async function track(userId: string|undefined,input: {sessionId:string;events:Array<{event:string;shelf:string;storyId?:string;position?:number}>}) {
  const session=await getSession(input.sessionId,userId);
  const events=input.events.map(e=>{
    const ids=session.ordered[e.shelf];
    if(!ids || (e.event!=='discovery_shelf_view' && (!e.storyId || e.position===undefined || ids[e.position]!==e.storyId))) throw new ApiError(400,'Event does not match this discovery session');
    return {event_type:e.event,story_id:e.storyId,metadata:{source:'discovery',shelf:e.shelf,position:e.position,sessionId:input.sessionId}};
  });
  await repository.recordEvents(userId,events); return {recorded:events.length};
}
export async function getSimilarStories(storyId:string,userId?:string,limit=8) {
  const ctx=await repository.context(userId);
  const [source]=await repository.hydrate([storyId]);
  if(!source || !isStoryEligibleForDiscovery(source,ctx.blocked,ctx.preferences.allowMature) || ctx.hidden.has(storyId)) return [];
  const [overlap,interests]=await Promise.all([repository.collaborative([storyId],userId),repository.interestIds([source.genre],source.tags,[])]);
  const pool=await repository.hydrate([...overlap.map(s=>s.story_id),...interests]);
  const profile=buildProfile(ctx.signals,ctx.followed,{...ctx.preferences,genres:[source.genre],tags:source.tags});
  for(const id of ctx.consumed) profile.consumed.add(id);
  const scores=normalized(overlap);
  return diversify(pool.filter(s=>s.id!==storyId && !profile.consumed.has(s.id) && !ctx.hidden.has(s.id) && isStoryEligibleForDiscovery(s,ctx.blocked,ctx.preferences.allowMature)).sort((a,b)=>recommendationScore(b,profile,scores.get(b.id))-recommendationScore(a,profile,scores.get(a.id))||a.id.localeCompare(b.id)),limit).map(storyCard);
}
