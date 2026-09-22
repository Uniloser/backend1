"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFollowedChapters = listFollowedChapters;
exports.listRecentReleases = listRecentReleases;
exports.listFollowedStories = listFollowedStories;
exports.listByGenre = listByGenre;
exports.listTrending = listTrending;
exports.searchStories = searchStories;
const supabase_1 = require("../config/supabase");
async function listFollowedChapters(userId, limit) {
    const db = (0, supabase_1.getSupabaseAdmin)();
    const { data: follows, error: followsError } = await db
        .from('follows')
        .select('followed_id')
        .eq('follower_id', userId);
    if (followsError)
        throw followsError;
    const authorIds = (follows ?? []).map((follow) => follow.followed_id);
    if (authorIds.length === 0) {
        return [];
    }
    const { data: stories, error: storiesError } = await db
        .from('stories')
        .select('id')
        .in('author_id', authorIds)
        .eq('status', 'published');
    if (storiesError)
        throw storiesError;
    const storyIds = (stories ?? []).map((story) => story.id);
    if (storyIds.length === 0) {
        return [];
    }
    const { data, error } = await db
        .from('chapters')
        .select('*, story:stories!chapters_story_id_fkey(*)')
        .eq('status', 'published')
        .in('story_id', storyIds)
        .order('published_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function listRecentReleases(limit) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('*, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function listFollowedStories(userId, limit) {
    const db = (0, supabase_1.getSupabaseAdmin)();
    const { data: follows, error: followsError } = await db
        .from('follows')
        .select('followed_id')
        .eq('follower_id', userId);
    if (followsError)
        throw followsError;
    const authorIds = (follows ?? []).map((follow) => follow.followed_id);
    if (authorIds.length === 0) {
        return [];
    }
    const { data, error } = await db
        .from('stories')
        .select('*, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)')
        .in('author_id', authorIds)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function listByGenre(genre, limit, offset) {
    let query = (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('*, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (genre) {
        query = query.eq('genre_id', genre);
    }
    const { data, error } = await query;
    if (error)
        throw error;
    return data ?? [];
}
async function listTrending(limit) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('*, likes(count)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function searchStories(query, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
// Feed/discovery repository stub.
// TODO: own SQL reads for followed-author chapters, genre browse, recent
// releases, trending inputs (likes/reads/comments with time decay), and
// title/tag search. Keep cache orchestration in the service layer.
