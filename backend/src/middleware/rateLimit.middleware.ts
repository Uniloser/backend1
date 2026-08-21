const rateLimit = require('express-rate-limit') as any;

export const authRateLimit = rateLimit({
	limit: 10,
	windowMs: 15 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		error: {
			message: 'Too many authentication requests. Please wait and try again later.',
		},
	},
});
// Rate-limit middleware stub.
// TODO: configure public-read, auth, write, and upload limits separately, with
// Redis-backed storage when available.
