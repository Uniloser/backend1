import { env } from '../config/env';
import { getSupabaseAdmin } from '../config/supabase';

const bucketNames = {
	cover: env.coverBucket,
	avatar: env.avatarBucket,
	panel: env.panelBucket,
} as const;

export async function uploadImage(
	target: keyof typeof bucketNames,
	objectPath: string,
	content: Uint8Array,
) {
	const bucket = bucketNames[target];
	const { error } = await getSupabaseAdmin().storage
		.from(bucket)
		.upload(objectPath, content, { contentType: 'image/webp', upsert: true });

	if (error) throw error;

	const { data } = getSupabaseAdmin().storage.from(bucket).getPublicUrl(objectPath);
	return data.publicUrl;
}
// Supabase Storage repository stub.
// TODO: own bucket/object upload, replacement, deletion, and public URL access;
// keep Storage SDK calls out of controllers.
