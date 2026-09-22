"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.createDeliveries = createDeliveries;
exports.listForRecipient = listForRecipient;
exports.countUnread = countUnread;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const supabase_1 = require("../config/supabase");
const notificationSelect = 'id, recipient_id, actor_id, notification_type, story_id, chapter_id, comment_id, title, body, data, read_at, created_at, actor:users!notifications_actor_id_fkey(id, username, display_name, avatar_url)';
async function createNotification(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notifications')
        .insert({
        recipient_id: input.recipient_id,
        actor_id: input.actor_id ?? null,
        notification_type: input.notification_type,
        title: input.title,
        body: input.body ?? null,
        story_id: input.story_id ?? null,
        chapter_id: input.chapter_id ?? null,
        comment_id: input.comment_id ?? null,
        data: input.data ?? {},
    })
        .select(notificationSelect)
        .single();
    if (error)
        throw error;
    return data;
}
async function createDeliveries(notificationId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notification_deliveries')
        .upsert([
        { notification_id: notificationId, channel: 'push', status: 'pending' },
        { notification_id: notificationId, channel: 'email', status: 'pending' },
    ], { onConflict: 'notification_id,channel', ignoreDuplicates: true });
    if (error)
        throw error;
}
async function listForRecipient(recipientId, limit, offset) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notifications')
        .select(notificationSelect)
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
async function countUnread(recipientId) {
    const { count, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .is('read_at', null);
    if (error)
        throw error;
    return count ?? 0;
}
async function markRead(notificationId, recipientId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', recipientId)
        .select(notificationSelect)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function markAllRead(recipientId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', recipientId)
        .is('read_at', null)
        .select('id');
    if (error)
        throw error;
    return data ?? [];
}
