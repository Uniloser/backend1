import { getSupabaseAdmin } from '../config/supabase';
import { DISCOVERY_CONFIG as C } from '../discovery/config';
import type { Candidate, Metrics, Preferences, Signal } from '../discovery/types';

async function data<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const result = await query; if (result.error) throw result.error; return result.data as T;
}
export function normalizeCandidate(row: Candidate): Candidate {
  const zero = { unique_readers: 0, readers_7d: 0, readers_previous_7d: 0, reads_lifetime: 0, reads_24h: 0, reads_7d: 0, reads_30d: 0, likes: 0, likes_7d: 0, likes_30d: 0, bookmarks: 0, bookmarks_7d: 0, bookmarks_30d: 0, comments: 0, comments_7d: 0, comments_30d: 0, followers: 0, followers_7d: 0, completion_rate: 0, retention_rate: 0, retention_3_rate: 0, average_progress: 0 };
  return { ...row, tags: row.tags ?? [], metrics: { ...zero, ...row.metrics, published_at: row.published_at, last_chapter_published_at: row.last_chapter_published_at, chapters_published: row.chapters_published, last_activity_at: row.metrics?.last_activity_at ?? row.last_chapter_published_at } };
}
export async function hydrate(ids: string[]): Promise<Candidate[]> {
  if (!ids.length) return [];
  // PostgREST's default row cap cannot silently truncate this bounded pool.
  const unique = [...new Set(ids)];
  const batches: string[][] = []; for (let i = 0; i < unique.length; i += 100) batches.push(unique.slice(i, i + 100));
  const rows = await Promise.all(batches.map(batch => data<Candidate[]>(getSupabaseAdmin().from('discovery_eligible').select('*').in('id', batch))));
  return rows.flat().map(normalizeCandidate);
}
export async function globalIds(kind: 'trending' | 'rising' | 'hidden_gems' | 'recently_updated' | 'new') {
  const db = getSupabaseAdmin();
  if (kind === 'new' || kind === 'recently_updated') {
    const rows = await data<Array<{ id: string }>>(db.from('discovery_eligible').select('id').order(kind === 'new' ? 'published_at' : 'last_chapter_published_at', { ascending: false, nullsFirst: false }).order('id').limit(C.limits.candidates));
    return rows.map(r => r.id);
  }
  const field = kind === 'hidden_gems' ? 'hidden_gem_score' : `${kind}_score`;
  const rows = await data<Array<{ id: string }>>(db.from('discovery_eligible').select('id').gt(field, 0).order(field, { ascending: false }).order('id').limit(C.limits.candidates));
  return rows.map(r => r.id);
}
export async function interestIds(genres: string[], tags: string[], authors: string[]) {
  const db = getSupabaseAdmin();
  const base = () => db.from('discovery_eligible').select('id').order('published_at', { ascending: false }).order('id').limit(C.limits.candidates);
  const queries = [];
  if (genres.length) queries.push(data<Array<{ id: string }>>(base().in('genre', genres)));
  if (tags.length) queries.push(data<Array<{ id: string }>>(base().overlaps('tags', tags)));
  if (authors.length) queries.push(data<Array<{ id: string }>>(base().in('author_id', authors)));
  return (await Promise.all(queries)).flat().map(s => s.id);
}
export async function context(userId?: string) {
  const empty = { signals: [] as Signal[], followed: [] as string[], blocked: new Set<string>(), hidden: new Set<string>(), consumed: new Set<string>(), preferences: { genres: [], tags: [], allowMature: false } as Preferences };
  if (!userId) return empty;
  const db = getSupabaseAdmin();
  const [signals, follows, blocks, user] = await Promise.all([
    data<Signal[]>(db.rpc('discovery_user_signals', { p_user: userId, p_limit: C.limits.profile })),
    data<Array<{ followed_id: string }>>(db.from('follows').select('followed_id').eq('follower_id', userId).limit(500)),
    // Security exclusions must not be silently truncated at a PostgREST row limit.
    data<{ blocked: string[]; hidden: string[]; consumed:string[] }>(db.rpc('discovery_exclusions', { p_user: userId })),
    data<{ preferences: Preferences } | null>(db.from('user_discovery_preferences').select('preferences').eq('user_id', userId).maybeSingle()),
  ]);
  return { signals: signals ?? [], followed: follows.map(f => f.followed_id), blocked: new Set(blocks.blocked), hidden: new Set(blocks.hidden), consumed:new Set(blocks.consumed), preferences: { ...empty.preferences, ...user?.preferences } };
}
export async function collaborative(seeds: string[], userId?: string) {
  if (!seeds.length) return [];
  return data<Array<{ story_id: string; score: number }>>(getSupabaseAdmin().rpc('discovery_collaborative', { p_seeds: seeds.slice(0, 5), p_user: userId ?? null, p_limit: C.limits.candidates, p_peers: C.limits.peers, p_weights: C.interests }));
}
export async function genres() { return data<Array<{ name: string; slug: string }>>(getSupabaseAdmin().from('genres').select('name,slug').order('name').limit(100)); }
export async function savePreferences(userId: string, preferences: Preferences) {
  await data(getSupabaseAdmin().from('user_discovery_preferences').upsert({ user_id: userId, preferences },{onConflict:'user_id'})); return preferences;
}
export async function recordEvents(userId: string | undefined, events: Array<{ event_type: string; story_id?: string; metadata: Record<string, unknown> }>) {
  await data(getSupabaseAdmin().from('user_events').insert(events.map(e => ({ ...e, user_id: userId ?? null }))));
}
export async function recordChapter(userId: string, storyId: string, chapterId: string) {
  await data(getSupabaseAdmin().rpc('discovery_record_chapter', { p_user: userId, p_story: storyId, p_chapter: chapterId }));
}
export async function metricsBatch(after: string | null) {
  return data<Array<{ story_id: string; metrics: Metrics }>>(getSupabaseAdmin().rpc('discovery_metrics_batch', { p_after: after, p_limit: 100 }));
}
export async function saveStats(rows: unknown[]) { await data(getSupabaseAdmin().from('story_discovery_stats').upsert(rows, { onConflict: 'story_id' })); }
export async function canReadStory(storyId:string,userId?:string) {
  return data<boolean>(getSupabaseAdmin().rpc('discovery_can_read_story',{p_story:storyId,p_user:userId??null}));
}
export async function browse(options: {userId?:string;genre?:string;query?:string;following?:boolean;trending?:boolean;limit:number;offset:number}) {
  const ctx=await context(options.userId);
  let query=getSupabaseAdmin().from('discovery_eligible').select('*');
  if(!ctx.preferences.allowMature) query=query.eq('is_mature',false);
  if(ctx.blocked.size) query=query.not('author_id','in',`(${[...ctx.blocked].join(',')})`);
  if(ctx.hidden.size) query=query.not('id','in',`(${[...ctx.hidden].join(',')})`);
  if(options.genre) query=query.eq('genre',options.genre);
  if(options.following) { if(!ctx.followed.length) return []; query=query.in('author_id',ctx.followed); }
  if(options.query) {
    const pattern=JSON.stringify(`%${options.query.replace(/[\\%_]/g,'\\$&')}%`);
    query=query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }
  query=query.order(options.trending?'trending_score':options.following?'last_chapter_published_at':'published_at',{ascending:false,nullsFirst:false}).order('id').range(options.offset,options.offset+options.limit-1);
  return (await data<Candidate[]>(query)).map(normalizeCandidate);
}
