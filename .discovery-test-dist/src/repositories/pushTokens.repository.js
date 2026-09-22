"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsert = upsert;
exports.remove = remove;
exports.listForUser = listForUser;
const supabase_1 = require("../config/supabase");
async function upsert(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('push_tokens')
        .upsert({
        user_id: input.userId,
        token: input.token,
        platform: input.platform,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,token' })
        .select('id, token, platform')
        .single();
    if (error)
        throw error;
    return data;
}
async function remove(userId, token) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    if (error)
        throw error;
}
async function listForUser(userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);
    if (error)
        throw error;
    return (data ?? []);
}
