const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxFileSize = 10 * 1024 * 1024;
const maxPanelFileSize = 15 * 1024 * 1024;

export function validateImageFile(file: any, target: 'cover' | 'avatar' | 'panel' = 'cover') {
	if (!file || !allowedMimeTypes.has(file.mimetype)) {
		throw new Error('Only JPEG, PNG, and WebP images are supported');
	}

	const limit = target === 'panel' ? maxPanelFileSize : maxFileSize;

	if (file.size > limit) {
		throw new Error(`Image must be ${Math.floor(limit / (1024 * 1024))} MB or smaller`);
	}
}
// Upload validation stub.
// TODO: validate multipart file type, size, and target (cover/avatar) before
// sharp processing; reject unsupported formats cleanly.
