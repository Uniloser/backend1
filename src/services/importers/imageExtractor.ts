// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Image Extractor
// ─────────────────────────────────────────────────────────────────────────────
import { getSupabaseAdmin, supabase } from '../../config/supabase';
import type { ImportContext } from './types';

const ASSETS_BUCKET = 'story-assets';

function getStorageClient() {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export interface UploadedImage {
  storagePath: string;
  signedUrl: string;
  alt: string;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  mimeType: string,
  altText: string,
  context: ImportContext,
  index: number,
): Promise<UploadedImage | null> {
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
  } catch (err) {
    console.warn('[ImageExtractor] Upload buffer notice:', err);
    return null;
  }
}

export async function uploadImages(
  images: Array<{ buffer: Buffer; mimeType: string; alt?: string }>,
  context: ImportContext,
): Promise<UploadedImage[]> {
  const results: UploadedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const uploaded = await uploadImageBuffer(
      img.buffer,
      img.mimeType,
      img.alt ?? '',
      context,
      i,
    );
    if (uploaded) results.push(uploaded);
  }

  return results;
}

export async function deleteImportImages(context: ImportContext): Promise<void> {
  try {
    const client = getStorageClient();
    const prefix = `${context.userId}/${context.storyId}/${context.importId}/images/`;

    const { data: files } = await client.storage
      .from(ASSETS_BUCKET)
      .list(prefix);

    if (!files || files.length === 0) return;

    const paths = files.map((f: { name: string }) => `${prefix}${f.name}`);
    await client.storage.from(ASSETS_BUCKET).remove(paths);
  } catch (err) {
    console.warn('[ImageExtractor] Cleanup notice:', err);
  }
}

export async function deleteManuscriptFile(storagePath: string): Promise<void> {
  try {
    const client = getStorageClient();
    await client.storage.from('manuscripts').remove([storagePath]);
  } catch (err) {
    console.warn('[ImageExtractor] Manuscript delete notice:', err);
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
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

