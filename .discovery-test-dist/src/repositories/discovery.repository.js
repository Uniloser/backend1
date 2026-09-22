"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCandidate = normalizeCandidate;
exports.hydrate = hydrate;
exports.globalIds = globalIds;
exports.interestIds = interestIds;
exports.context = context;
exports.collaborative = collaborative;
exports.genres = genres;
exports.savePreferences = savePreferences;
exports.recordEvents = recordEvents;
exports.recordChapter = recordChapter;
exports.metricsBatch = metricsBatch;
exports.saveStats = saveStats;
exports.canReadStory = canReadStory;
exports.browse = browse;
const supabase_1 = require("../config/supabase");
const config_1 = require("../discovery/config");
async function data(query) {
    const result = await query;
    if (result.error)
        throw result.error;
    return result.data;
}
function normalizeCandidate(row) {
    const zero = { unique_readers: 0, readers_7d: 0, readers_previous_7d: 0, reads_lifetime: 0, reads_24h: 0, reads_7d: 0, reads_30d: 0, likes: 0, likes_7d: 0, likes_30d: 0, bookmarks: 0, bookmarks_7d: 0, bookmarks_30d: 0, comments: 0, comments_7d: 0, comments_30d: 0, followers: 0, followers_7d: 0, completion_rate: 0, retention_rate: 0, retention_3_rate: 0, average_progress: 0 };
    return { ...row, tags: row.tags ?? [], metrics: { ...zero, ...row.metrics, published_at: row.published_at, last_chapter_published_at: row.last_chapter_published_at, chapters_published: row.chapters_published, last_activity_at: row.metrics?.last_activity_at ?? row.last_chapter_published_at } };
}
async function hydrate(ids) {
    if (!ids.length)
        return [];
    // PostgREST's default row cap cannot silently truncate this bounded pool.
    const unique = [...new Set(ids)];
    const batches = [];
    for (let i = 0; i < unique.length; i += 100)
        batches.push(unique.slice(i, i + 100));
    const rows = await Promise.all(batches.map(batch => data((0, supabase_1.getSupabaseAdmin)().from('discovery_eligible').select('*').in('id', batch))));
    return rows.flat().map(normalizeCandidate);
}
async function globalIds(kind) {
    const db = (0, supabase_1.getSupabaseAdmin)();
    if (kind === 'new' || kind === 'recently_updated') {
        const rows = await data(db.from('stories').select('id').eq('status', 'published').order(kind === 'new' ? 'published_at' : 'last_chapter_published_at', { ascending: false, nullsFirst: false }).order('id').limit(config_1.DISCOVERY_CONFIG.limits.candidates));
        return rows.map(r => r.id);
    }
    const field = kind === 'hidden_gems' ? 'hidden_gem_score' : `${kind}_score`;
    const rows = await data(db.from('story_discovery_stats').select('story_id').gt(field, 0).order(field, { ascending: false }).order('story_id').limit(config_1.DISCOVERY_CONFIG.limits.candidates));
    return rows.map(r => r.story_id);
}
async function interestIds(genres, tags, authors) {
    const db = (0, supabase_1.getSupabaseAdmin)();
    const base = () => db.from('stories').select('id').eq('status', 'published').order('published_at', { ascending: false }).order('id').limit(config_1.DISCOVERY_CONFIG.limits.candidates);
    const queries = [];
    if (genres.length)
        queries.push(data(base().in('genre', genres)));
    if (tags.length)
        queries.push(data(base().overlaps('tags', tags)));
    if (authors.length)
        queries.push(data(base().in('author_id', authors)));
    return (await Promise.all(queries)).flat().map(s => s.id);
}
async function context(userId) {
    const empty = { signals: [], followed: [], blocked: new Set(), hidden: new Set(), preferences: { genres: [], tags: [], allowMature: false } };
    if (!userId)
        return empty;
    const db = (0, supabase_1.getSupabaseAdmin)();
    const [signals, follows, blocks, user] = await Promise.all([
        data(db.rpc('discovery_user_signals', { p_user: userId, p_limit: config_1.DISCOVERY_CONFIG.limits.profile })),
        data(db.from('follows').select('followed_id').eq('follower_id', userId).limit(500)),
        // Security exclusions must not be silently truncated at a PostgREST row limit.
        data(db.rpc('discovery_exclusions', { p_user: userId })),
        data(db.from('user_discovery_preferences').select('preferences').eq('user_id', userId).maybeSingle()),
    ]);
    return { signals: signals ?? [], followed: follows.map(f => f.followed_id), blocked: new Set(blocks.blocked), hidden: new Set(blocks.hidden), preferences: { ...empty.preferences, ...user?.preferences } };
}
async function collaborative(seeds, userId) {
    if (!seeds.length)
        return [];
    return data((0, supabase_1.getSupabaseAdmin)().rpc('discovery_collaborative', { p_seeds: seeds.slice(0, 5), p_user: userId ?? null, p_limit: config_1.DISCOVERY_CONFIG.limits.candidates, p_peers: config_1.DISCOVERY_CONFIG.limits.peers }));
}
async function genres() { return data((0, supabase_1.getSupabaseAdmin)().from('genres').select('name,slug').order('name').limit(100)); }
async function savePreferences(userId, preferences) {
    await data((0, supabase_1.getSupabaseAdmin)().from('user_discovery_preferences').upsert({ user_id: userId, preferences }, { onConflict: 'user_id' }));
    return preferences;
}
async function recordEvents(userId, events) {
    await data((0, supabase_1.getSupabaseAdmin)().from('user_events').insert(events.map(e => ({ ...e, user_id: userId ?? null }))));
}
async function recordChapter(userId, storyId, chapterId) {
    await data((0, supabase_1.getSupabaseAdmin)().rpc('discovery_record_chapter', { p_user: userId, p_story: storyId, p_chapter: chapterId }));
}
async function metricsBatch(after) {
    return data((0, supabase_1.getSupabaseAdmin)().rpc('discovery_metrics_batch', { p_after: after, p_limit: 100 }));
}
async function saveStats(rows) { await data((0, supabase_1.getSupabaseAdmin)().from('story_discovery_stats').upsert(rows, { onConflict: 'story_id' })); }
async function canReadStory(storyId, userId) {
    return data((0, supabase_1.getSupabaseAdmin)().rpc('discovery_can_read_story', { p_story: storyId, p_user: userId ?? null }));
}
async function browse(options) {
    const ctx = await context(options.userId);
    let query = (0, supabase_1.getSupabaseAdmin)().from('discovery_eligible').select('*');
    if (!ctx.preferences.allowMature)
        query = query.eq('is_mature', false);
    if (ctx.blocked.size)
        query = query.not('author_id', 'in', `(${[...ctx.blocked].join(',')})`);
    if (ctx.hidden.size)
        query = query.not('id', 'in', `(${[...ctx.hidden].join(',')})`);
    if (options.genre)
        query = query.eq('genre', options.genre);
    if (options.following) {
        if (!ctx.followed.length)
            return [];
        query = query.in('author_id', ctx.followed);
    }
    if (options.query)
        query = query.ilike('title', `%${options.query.replace(/[%_]/g, '\\$&')}%`);
    query = query.order(options.trending ? 'trending_score' : options.following ? 'last_chapter_published_at' : 'published_at', { ascending: false }).order('id').range(options.offset, options.offset + options.limit - 1);
    return (await data(query)).map(normalizeCandidate);
}
