"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.listBlocked = listBlocked;
exports.isBlocked = isBlocked;
const supabase_1 = require("../config/supabase");
async function blockUser(blockerId, blockedId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('user_blocks')
        .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
        .select('blocker_id, blocked_id, created_at')
        .single();
    if (error)
        throw error;
    return data;
}
async function unblockUser(blockerId, blockedId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
    if (error)
        throw error;
}
async function listBlocked(blockerId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('user_blocks')
        .select('blocked_id, created_at, blocked:users!user_blocks_blocked_id_fkey(id, username, display_name, avatar_url)')
        .eq('blocker_id', blockerId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function isBlocked(blockerId, blockedId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId)
        .maybeSingle();
    if (error)
        throw error;
    return Boolean(data);
}
