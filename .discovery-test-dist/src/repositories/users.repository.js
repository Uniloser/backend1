"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByUsername = findByUsername;
exports.findById = findById;
exports.updateById = updateById;
exports.listPublishedStories = listPublishedStories;
exports.countFollowers = countFollowers;
const supabase_1 = require("../config/supabase");
const profileFields = 'id, username, display_name, bio, avatar_url, created_at, updated_at';
async function findByUsername(username) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('users')
        .select(profileFields)
        .eq('username', username)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function findById(userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('users')
        .select(profileFields)
        .eq('id', userId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function updateById(userId, input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('users')
        .update(input)
        .eq('id', userId)
        .select(profileFields)
        .single();
    if (error)
        throw error;
    return data;
}
async function listPublishedStories(authorId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('*')
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function countFollowers(userId) {
    const { count, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followed_id', userId);
    if (error)
        throw error;
    return count ?? 0;
}
// Sole users-table repository stub.
// TODO: implement profile lookup by username/id, current-user lookup, profile
// update for bio/display_name/avatar_url, published-story summary, and
// follower/following counts. No other file may query public.users directly.
