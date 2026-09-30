require('dotenv').config();

function requiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL ?? (isProduction ? undefined : 'http://localhost:8082');
if (!frontendUrl) throw new Error('FRONTEND_URL is required in production.');
const localDevOrigins = isProduction ? [] : [
	'http://localhost:8081',
	'http://localhost:8082',
	'http://127.0.0.1:8081',
	'http://127.0.0.1:8082',
];
const corsOrigins = Array.from(new Set([
	new URL(frontendUrl).origin,
	...localDevOrigins,
	...(process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean).map((origin) => new URL(origin).origin),
]));

export const env = {
	port: Number(process.env.PORT ?? 3000),
	host: process.env.HOST ?? '0.0.0.0',
	frontendUrl,
	corsOrigins,
	trustProxyHops: (() => {
		const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
		if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
			throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10.');
		}
		return hops;
	})(),
	supabaseUrl: requiredEnv('SUPABASE_URL'),
	supabaseAnonKey: requiredEnv('SUPABASE_ANON_KEY'),
	supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
		?? process.env.SUPABASE_SECRET_KEY,
	redisUrl: process.env.REDIS_URL,
	coverBucket: process.env.SUPABASE_COVER_BUCKET ?? 'covers',
	avatarBucket: process.env.SUPABASE_AVATAR_BUCKET ?? 'avatars',
	panelBucket: process.env.SUPABASE_PANEL_BUCKET ?? 'panels',
} as const;
// Environment configuration stub.
// TODO: validate and export the Supabase URL/key, Redis URL, server port, and
// storage bucket names. Fail fast when required values are missing.
