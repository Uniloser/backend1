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
		.resize({ width: resizeWidth, withoutEnlargement: true })
		.webp({ quality: target === 'panel' ? 85 : 82 })
		.toBuffer();

	const objectPath = `${userId}/${Date.now()}.webp`;
	const url = await uploadsRepository.uploadImage(target, objectPath, processed);

	return {
		url,
		width: metadata.width ?? null,
		height: metadata.height ?? null,
	};
}
// Upload service stub.
// TODO: coordinate multer input, sharp resizing/compression to WebP, Supabase
// Storage bucket selection, public URL creation, and cleanup on failure.
