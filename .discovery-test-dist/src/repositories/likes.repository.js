"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addLike = addLike;
exports.removeLike = removeLike;
const supabase_1 = require("../config/supabase");
async function addLike(userId, storyId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('likes')
        .upsert({ user_id: userId, story_id: storyId }, { onConflict: 'user_id,story_id' })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function removeLike(userId, storyId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('story_id', storyId);
    if (error)
        throw error;
}
// Likes-table repository stub.
// TODO: own idempotent story like insert/delete and viewer like-state lookup;
// coordinate optional stories.like_count updates transactionally where needed.
