import { ApiError } from '../utils/ApiError';

export function errorHandler(error: unknown, _request: any, response: any, _next: any) {
	if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'MulterError') {
		const uploadError = error as { code?: string };
		response.status(uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
			error: { message: uploadError.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file is too large' : 'Upload could not be processed' },
		});
		return;
	}

	if (error && typeof error === 'object' && 'type' in error) {
		const bodyError = error as { type?: string };
		if (bodyError.type === 'entity.too.large') {
			response.status(413).json({ error: { message: 'Request is too large' } });
			return;
		}
		if (bodyError.type === 'entity.parse.failed') {
			response.status(400).json({ error: { message: 'Request body is not valid JSON' } });
			return;
		}
	}

	if (error instanceof ApiError) {
		response.status(error.statusCode).json({
			error: {
				message: error.message,
				details: error.details,
			},
		});
		return;
	}

	if (error && typeof error === 'object' && 'issues' in error) {
		const issues = (error as { issues: Array<{ code?: string; message?: string; path?: Array<string | number> }> }).issues;
		response.status(400).json({
			error: {
				message: 'Request validation failed',
				details: issues.map(({ code, message, path }) => ({ code, message, path })),
			},
		});
		return;
	}

	if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
		const dbError = error as { code: string; message: string };

		if (dbError.code === '42501') {
			response.status(503).json({
				error: { message: 'Database access is not configured' },
			});
			return;
		}

		if (dbError.code === '23505') {
			response.status(409).json({
				error: { message: 'Resource already exists' },
			});
			return;
		}

		console.error('Database operation failed.', { code: dbError.code });
		response.status(500).json({ error: { message: 'Database error' } });
		return;
	}

	console.error('Unhandled API error.', { name: error instanceof Error ? error.name : 'UnknownError' });
	response.status(500).json({ error: { message: 'Internal server error' } });
}
// Central error-handler stub.
// TODO: normalize ApiError, Zod, Supabase, multer, and unexpected errors into
// stable JSON responses without leaking database details.
