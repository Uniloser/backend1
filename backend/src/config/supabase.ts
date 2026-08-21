import { env } from './env';
import { ApiError } from '../utils/ApiError';

const { createClient } = require('@supabase/supabase-js') as {
	createClient: (url: string, key: string, options?: Record<string, unknown>) => any;
};

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

export const supabaseAdmin = env.supabaseServiceRoleKey
	? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	  })
	: undefined;

export function getSupabaseAdmin() {
	if (!supabaseAdmin) {
		throw new ApiError(503, 'Server database access is not configured');
	}

	return supabaseAdmin;
}
// Supabase client stub.
// TODO: create and export the configured Supabase server client used by
// repositories and auth.middleware.js.
// TODO: keep all database access behind repositories; this file only owns
// client construction and configuration.
