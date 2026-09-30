const sharp = require('sharp') as any;

import * as uploadsRepository from '../repositories/uploads.repository';
import { validateImageFile } from '../validators/uploads.validator';

type UploadTarget = 'cover' | 'avatar' | 'panel';

export async function uploadImage(target: UploadTarget, userId: string, file: any) {
	validateImageFile(file, target);

	const sharpInstance = sharp(file.buffer);
	const metadata = await sharpInstance.metadata();
	const resizeWidth = target === 'panel' ? 1200 : 800;

	const processed = await sharp(file.buffer)
		.rotate()
		.resize({ width: resizeWidth, withoutEnlargement: true })
		.webp({ quality: target === 'panel' ? 85 : 82 })
		.toBuffer();

	const uploadId = Date.now();
	const fileBase = target === 'cover' ? `${uploadId}-cover` : `${uploadId}`;
	const objectPath = `${userId}/${fileBase}.webp`;
	const url = await uploadsRepository.uploadImage(target, objectPath, processed);

	if (target === 'cover') {
		const thumbnailPath = `${userId}/${fileBase}-thumb.webp`;
		try {
			const thumbnail = await sharp(file.buffer)
				.rotate()
				.resize({ width: 300, height: 450, fit: 'cover', position: 'centre' })
				.webp({ quality: 76, effort: 4 })
				.toBuffer();
			await uploadsRepository.uploadImage(target, thumbnailPath, thumbnail);
		} catch (error) {
			await uploadsRepository.removeImage(target, objectPath).catch(() => undefined);
			throw error;
		}
	}

	return {
		url,
		width: metadata.width ?? null,
		height: metadata.height ?? null,
	};
}
// Upload service stub.
// TODO: coordinate multer input, sharp resizing/compression to WebP, Supabase
// Storage bucket selection, public URL creation, and cleanup on failure.
