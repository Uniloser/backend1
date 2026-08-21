const sharp = require('sharp') as any;

import * as uploadsRepository from '../repositories/uploads.repository';
import { validateImageFile } from '../validators/uploads.validator';

export async function uploadImage(target: 'cover' | 'avatar', userId: string, file: any) {
	validateImageFile(file);
	const processed = await sharp(file.buffer)
		.resize({ width: 800, withoutEnlargement: true })
		.webp({ quality: 82 })
		.toBuffer();

	const objectPath = `${userId}/${Date.now()}.webp`;
	return uploadsRepository.uploadImage(target, objectPath, processed);
}
// Upload service stub.
// TODO: coordinate multer input, sharp resizing/compression to WebP, Supabase
// Storage bucket selection, public URL creation, and cleanup on failure.
