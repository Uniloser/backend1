"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectStoryAsset = redirectStoryAsset;
const supabase_1 = require("../config/supabase");
const ApiError_1 = require("../utils/ApiError");
const ASSETS_BUCKET = 'story-assets';
async function redirectStoryAsset(request, response) {
    const rawPath = Array.isArray(request.params.path) ? request.params.path.join('/') : request.params.path;
    const storagePath = String(rawPath ?? '').replace(/^\/+/, '');
    if (!storagePath || storagePath.includes('..')) {
        throw new ApiError_1.ApiError(400, 'Invalid media path');
    }
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .storage
        .from(ASSETS_BUCKET)
        .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
        throw new ApiError_1.ApiError(404, 'Media asset not found');
    }
    response.redirect(302, data.signedUrl);
}
