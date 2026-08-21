import { ApiError } from '../utils/ApiError';

export function errorHandler(error: unknown, _request: any, response: any, _next: any) {
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
		response.status(400).json({
			error: {
				message: 'Request validation failed',
				details: (error as { issues: unknown }).issues,
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

		console.error(dbError);
		response.status(500).json({ error: { message: 'Database error' } });
		return;
	}

	console.error(error);
	response.status(500).json({ error: { message: 'Internal server error' } });
}
// Central error-handler stub.
// TODO: normalize ApiError, Zod, Supabase, multer, and unexpected errors into
// stable JSON responses without leaking database details.
