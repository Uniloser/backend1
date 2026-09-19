import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

const ASSETS_BUCKET = 'story-assets';

export async function redirectStoryAsset(request: any, response: any) {
	const rawPath = Array.isArray(request.params.path) ? request.params.path.join('/') : request.params.path;
	const storagePath = String(rawPath ?? '').replace(/^\/+/, '');
	if (!storagePath || storagePath.includes('..')) {
		throw new ApiError(400, 'Invalid media path');
	}

	const { data, error } = await getSupabaseAdmin()
		.storage
		.from(ASSETS_BUCKET)
		.createSignedUrl(storagePath, 3600);

	if (error || !data?.signedUrl) {
		throw new ApiError(404, 'Media asset not found');
	}

	response.redirect(302, data.signedUrl);
}
