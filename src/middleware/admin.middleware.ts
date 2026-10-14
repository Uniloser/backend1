import { ApiError } from '../utils/ApiError';

export function requireAdmin(request: any, _response: any, next: any) {
	if (request.user?.app_metadata?.role !== 'admin') {
		return next(new ApiError(403, 'Administrator access required.'));
	}
	next();
}
