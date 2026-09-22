"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listByUser = listByUser;
exports.upsertStoryLevel = upsertStoryLevel;
exports.deleteById = deleteById;
exports.deleteByStory = deleteByStory;
const supabase_1 = require("../config/supabase");
const bookmarkSelect = 'id, user_id, story_id, chapter_id, note, created_at, updated_at, story:stories!bookmarks_story_id_fkey(*)';
async function listByUser(userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('bookmarks')
        .select(bookmarkSelect)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function upsertStoryLevel(userId, input) {
    await (0, supabase_1.getSupabaseAdmin)()
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('story_id', input.story_id);
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('bookmarks')
        .insert({
        user_id: userId,
        story_id: input.story_id,
        chapter_id: input.chapter_id ?? null,
        note: input.note ?? null,
    })
        .select(bookmarkSelect)
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteById(bookmarkId, userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function deleteByStory(userId, storyId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('story_id', storyId)
        .select('id');
    if (error)
        throw error;
    return data ?? [];
}
