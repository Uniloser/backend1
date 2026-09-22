"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findStory = findStory;
exports.createStory = createStory;
exports.updateStory = updateStory;
exports.deleteStory = deleteStory;
exports.countChapters = countChapters;
exports.listPublishedStoriesByAuthor = listPublishedStoriesByAuthor;
exports.listStoriesByAuthor = listStoriesByAuthor;
exports.listRecommendations = listRecommendations;
exports.listPopularPublishedExcluding = listPopularPublishedExcluding;
const supabase_1 = require("../config/supabase");
const storySelect = '*, author:users!stories_author_id_fkey(id, username, display_name, avatar_url)';
async function findStory(storyId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select(storySelect)
        .eq('id', storyId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function createStory(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .insert(input)
        .select(storySelect)
        .single();
    if (error)
        throw error;
    return data;
}
async function updateStory(storyId, input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .update(input)
        .eq('id', storyId)
        .select(storySelect)
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteStory(storyId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .delete()
        .eq('id', storyId);
    if (error)
        throw error;
}
async function countChapters(storyId) {
    const { count, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .select('id', { count: 'exact', head: true })
        .eq('story_id', storyId);
    if (error)
        throw error;
    return count ?? 0;
}
async function listPublishedStoriesByAuthor(authorId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select(storySelect)
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function listStoriesByAuthor(authorId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select(storySelect)
        .eq('author_id', authorId)
        .order('updated_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function listRecommendations(storyId, genreId, limit = 8) {
    let query = (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select(storySelect)
        .eq('status', 'published')
        .neq('id', storyId);
    if (genreId) {
        query = query.eq('genre_id', genreId);
    }
    const { data, error } = await query
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
async function listPopularPublishedExcluding(excludeIds, limit = 8) {
    if (limit <= 0)
        return [];
    let query = (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select(storySelect)
        .eq('status', 'published');
    if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }
    const { data, error } = await query
        .order('view_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
