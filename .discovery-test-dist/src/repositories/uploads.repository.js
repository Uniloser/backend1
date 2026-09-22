"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = uploadImage;
const env_1 = require("../config/env");
const supabase_1 = require("../config/supabase");
const bucketNames = {
    cover: env_1.env.coverBucket,
    avatar: env_1.env.avatarBucket,
    panel: env_1.env.panelBucket,
};
async function uploadImage(target, objectPath, content) {
    const bucket = bucketNames[target];
    const { error } = await (0, supabase_1.getSupabaseAdmin)().storage
        .from(bucket)
        .upload(objectPath, content, { contentType: 'image/webp', upsert: true });
    if (error)
        throw error;
    const { data } = (0, supabase_1.getSupabaseAdmin)().storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
}
// Supabase Storage repository stub.
// TODO: own bucket/object upload, replacement, deletion, and public URL access;
// keep Storage SDK calls out of controllers.
