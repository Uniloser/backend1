const rateLimit = require('express-rate-limit') as any;

type RateLimitRequest = {
	ip?: string;
	user?: { id?: string };
	body?: { email?: string; [key: string]: unknown };
};

function getClientIp(request: RateLimitRequest): string {
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

// The account key and IP key are applied together on signup/signin so callers
// cannot bypass throttling by rotating email addresses.
export const authIpRateLimit = rateLimit({
	limit: 60,
	windowMs: 15 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		error: {
			message: 'Too many sign-in attempts from this network. Please wait and try again later.',
		},
	},
});
// Rate limiting uses Express's client IP after the explicitly configured proxy
// chain, never a forwarding header supplied directly by the caller.
// TODO: configure public-read, auth, write, and upload limits separately, with
// Redis-backed storage when available.
