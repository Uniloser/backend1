"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.follow = follow;
exports.unfollow = unfollow;
exports.listFollowers = listFollowers;
exports.listFollowing = listFollowing;
exports.listFollowerIds = listFollowerIds;
exports.isFollowing = isFollowing;
const supabase_1 = require("../config/supabase");
async function follow(followerId, followedId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .upsert({ follower_id: followerId, followed_id: followedId }, { onConflict: 'follower_id,followed_id' })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function unfollow(followerId, followedId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('followed_id', followedId);
    if (error)
        throw error;
}
async function listFollowers(userId, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .select('created_at, follower:users!follows_follower_id_fkey(id, username, display_name, avatar_url)')
        .eq('followed_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
async function listFollowing(userId, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .select('created_at, followed:users!follows_followed_id_fkey(id, username, display_name, avatar_url)')
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
async function listFollowerIds(authorId, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .select('follower_id')
        .eq('followed_id', authorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return (data ?? []).map((row) => row.follower_id);
}
async function isFollowing(followerId, followedId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('followed_id', followedId)
        .maybeSingle();
    if (error)
        throw error;
    return Boolean(data);
}
// Follows-table repository stub.
// TODO: own follow upsert/delete and follower/following list queries.
