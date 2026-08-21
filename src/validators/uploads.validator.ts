const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 10 * 1024 * 1024;

export function validateImageFile(file: any) {
	if (!file || !allowedMimeTypes.has(file.mimetype)) {
		throw new Error('Only JPEG, PNG, and WebP images are supported');
	}

	if (file.size > maxFileSize) {
		throw new Error('Image must be 10 MB or smaller');
	}
}
// Upload validation stub.
// TODO: validate multipart file type, size, and target (cover/avatar) before
// sharp processing; reject unsupported formats cleanly.
