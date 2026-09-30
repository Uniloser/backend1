import { supabase, supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export async function signUp(email: string, password: string, username: string) {
	if (!supabaseAdmin) {
		throw new ApiError(503, 'Server profile setup is not configured');
	}

	const { data: existingProfile, error: usernameLookupError } = await supabaseAdmin
		.from('users')
		.select('id')
		.eq('username', username)
		.maybeSingle();
	if (usernameLookupError) throw new ApiError(503, 'Account registration is temporarily unavailable');
	if (existingProfile) throw new ApiError(409, 'That username is already taken');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: env.frontendUrl,
      data: { username },
    },
  });

  if (error) {
    const errorDetails = error as { status?: number; code?: string; message: string };
    const isRateLimited = errorDetails.status === 429
      || errorDetails.code === 'over_email_send_rate_limit'
      || /rate limit|too many requests|email.*send/i.test(errorDetails.message);

    if (isRateLimited) {
      throw new ApiError(429, 'Too many confirmation emails were requested. Please wait and try again later.');
    }

    throw new ApiError(400, 'We could not complete registration. Check the details and try again.');
  }

  if (!data.user) {
    throw new ApiError(400, 'Account could not be created');
  }

  // Supabase returns an identity-less user for an existing email when
  // email-based account enumeration protection is enabled. Leave that flow
  // indistinguishable from a confirmation-required signup and never create a
  // profile for the placeholder identity.
  if (data.user.identities?.length === 0) {
    return { user: data.user, session: null };
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({ id: data.user.id, username, is_alpha: true });

  if (profileError) {
	const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(data.user.id);
	if (rollbackError) {
		console.error('Could not roll back an incomplete signup.', { userId: data.user.id, code: rollbackError.code });
	}

    if (profileError.code === '23505') {
      throw new ApiError(409, 'That username is already taken');
    }

    throw new ApiError(400, 'Account profile could not be created');
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new ApiError(401, 'Invalid email or password');
  return data;
}

export async function signOut(accessToken: string) {
  const { createClient } = require('@supabase/supabase-js') as { createClient: (url: string, key: string, options: Record<string, unknown>) => any };
  const authenticatedClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
	global: { headers: { Authorization: `Bearer ${accessToken}` } },
	auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await authenticatedClient.auth.signOut({ scope: 'local' });

  if (error) throw new ApiError(400, error.message);
  return { signedOut: true };
}
