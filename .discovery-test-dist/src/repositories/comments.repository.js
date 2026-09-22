"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listByChapter = listByChapter;
exports.create = create;
exports.deleteById = deleteById;
const supabase_1 = require("../config/supabase");
async function listByChapter(chapterId, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comments')
        .select('id, chapter_id, text, created_at, user:users!comments_user_id_fkey(id, username, display_name, avatar_url)')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
async function create(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comments')
        .insert(input)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteById(commentId, userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();
    if (error)
        throw error;
    return data;
} // Comments-table repository stub.
// TODO: own paginated chapter comment reads, inserts, and deletes; expose only
// repository methods rather than direct table access to services/controllers.
