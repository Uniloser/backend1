require('dotenv').config();

function requiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export const env = {
	port: Number(process.env.PORT ?? 3000),
	host: process.env.HOST ?? '0.0.0.0',
	frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:8082',
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
