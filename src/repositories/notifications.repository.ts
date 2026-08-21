import { getSupabaseAdmin } from '../config/supabase';

const notificationSelect =
	'id, recipient_id, actor_id, notification_type, story_id, chapter_id, comment_id, title, body, data, read_at, created_at, actor:users!notifications_actor_id_fkey(id, username, display_name, avatar_url)';

export type CreateNotificationInput = {
	recipient_id: string;
	actor_id?: string | null;
	notification_type: string;
	title: string;
	body?: string | null;
	story_id?: string | null;
	chapter_id?: string | null;
	comment_id?: string | null;
	data?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
	const { data, error } = await getSupabaseAdmin()
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

	if (error) throw error;
	return data;
}

export async function createDeliveries(notificationId: string) {
	const { error } = await getSupabaseAdmin()
		.from('notification_deliveries')
		.upsert(
			[
				{ notification_id: notificationId, channel: 'push', status: 'pending' },
				{ notification_id: notificationId, channel: 'email', status: 'pending' },
			],
			{ onConflict: 'notification_id,channel', ignoreDuplicates: true },
		);

	if (error) throw error;
}

export async function listForRecipient(recipientId: string, limit: number, offset: number) {
	const { data, error } = await getSupabaseAdmin()
		.from('notifications')
		.select(notificationSelect)
		.eq('recipient_id', recipientId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) throw error;
	return data ?? [];
}

export async function countUnread(recipientId: string) {
	const { count, error } = await getSupabaseAdmin()
		.from('notifications')
		.select('id', { count: 'exact', head: true })
		.eq('recipient_id', recipientId)
		.is('read_at', null);

	if (error) throw error;
	return count ?? 0;
}

export async function markRead(notificationId: string, recipientId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('notifications')
		.update({ read_at: new Date().toISOString() })
		.eq('id', notificationId)
		.eq('recipient_id', recipientId)
		.select(notificationSelect)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function markAllRead(recipientId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('notifications')
		.update({ read_at: new Date().toISOString() })
		.eq('recipient_id', recipientId)
		.is('read_at', null)
		.select('id');

	if (error) throw error;
	return data ?? [];
}
