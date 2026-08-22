const rateLimit = require('express-rate-limit') as any;

type RateLimitRequest = {
	ip?: string;
	user?: { id?: string };
	headers?: Record<string, string | string[] | undefined>;
	body?: { email?: string; [key: string]: unknown };
};

function getClientIp(request: RateLimitRequest): string {
	const forwardedFor = request.headers?.['x-forwarded-for'];
	if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
		return forwardedFor[0].split(',')[0].trim() || 'unknown';
	}

	if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = request.headers?.['x-real-ip'];
	if (Array.isArray(realIp) && realIp.length > 0) {
		return realIp[0].trim() || 'unknown';
	}
	if (typeof realIp === 'string' && realIp.trim()) {
		return realIp.trim();
	}

	return request.ip || 'unknown';
}

function getRateLimitKey(request: RateLimitRequest): string {
	if (request.user?.id) {
		return `user:${request.user.id}`;
	}

	const email = request.body?.email;
	if (typeof email === 'string' && email.trim()) {
		return `user:${email.trim().toLowerCase()}`;
	}

	return `ip:${getClientIp(request)}`;
}

export const authRateLimit = rateLimit({
	limit: 10,
	windowMs: 15 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: getRateLimitKey,
	message: {
		error: {
			message: 'Too many authentication requests. Please wait and try again later.',
		},
	},
});
// Rate limiting is keyed by authenticated user ID first, then email, and finally
// the client IP address. This avoids one shared global bucket for every request.
// TODO: configure public-read, auth, write, and upload limits separately, with
// Redis-backed storage when available.
