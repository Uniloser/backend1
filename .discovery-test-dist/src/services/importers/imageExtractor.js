"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImageBuffer = uploadImageBuffer;
exports.uploadImages = uploadImages;
exports.deleteImportImages = deleteImportImages;
exports.deleteManuscriptFile = deleteManuscriptFile;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Image Extractor
// ─────────────────────────────────────────────────────────────────────────────
const supabase_1 = require("../../config/supabase");
const ASSETS_BUCKET = 'story-assets';
function getStorageClient() {
    try {
        return (0, supabase_1.getSupabaseAdmin)();
    }
    catch {
        return supabase_1.supabase;
    }
}
async function uploadImageBuffer(buffer, mimeType, altText, context, index) {
    try {
        const ext = mimeTypeToExt(mimeType);
        const filename = `image-${String(index + 1).padStart(3, '0')}.${ext}`;
        const storagePath = `${context.userId}/${context.storyId}/${context.importId}/images/${filename}`;
        const client = getStorageClient();
        const { error } = await client.storage
            .from(ASSETS_BUCKET)
            .upload(storagePath, buffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
        });
        if (error) {
            console.warn('[ImageExtractor] Upload notice:', error.message);
            return null;
        }
        const { data: signedData } = await client.storage
            .from(ASSETS_BUCKET)
            .createSignedUrl(storagePath, 3600);
        const fallbackUrl = client.storage.from(ASSETS_BUCKET).getPublicUrl(storagePath)?.data?.publicUrl ?? '';
        return {
            storagePath,
            signedUrl: signedData?.signedUrl ?? fallbackUrl,
            alt: altText || `Image ${index + 1}`,
        };
    }
    catch (err) {
        console.warn('[ImageExtractor] Upload buffer notice:', err);
        return null;
    }
}
async function uploadImages(images, context) {
    const results = [];
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const uploaded = await uploadImageBuffer(img.buffer, img.mimeType, img.alt ?? '', context, i);
        if (uploaded)
            results.push(uploaded);
    }
    return results;
}
async function deleteImportImages(context) {
    try {
        const client = getStorageClient();
        const prefix = `${context.userId}/${context.storyId}/${context.importId}/images/`;
        const { data: files } = await client.storage
            .from(ASSETS_BUCKET)
            .list(prefix);
        if (!files || files.length === 0)
            return;
        const paths = files.map((f) => `${prefix}${f.name}`);
        await client.storage.from(ASSETS_BUCKET).remove(paths);
    }
    catch (err) {
        console.warn('[ImageExtractor] Cleanup notice:', err);
    }
}
async function deleteManuscriptFile(storagePath) {
    try {
        const client = getStorageClient();
        await client.storage.from('manuscripts').remove([storagePath]);
    }
    catch (err) {
        console.warn('[ImageExtractor] Manuscript delete notice:', err);
    }
}
function mimeTypeToExt(mimeType) {
    const map = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
        'image/tiff': 'tiff',
    };
    return map[mimeType] ?? 'png';
}
