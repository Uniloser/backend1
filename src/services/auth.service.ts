import { supabase, supabaseAdmin } from '../config/supabase';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export async function signUp(email: string, password: string, username: string) {
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

    throw new ApiError(400, errorDetails.message);
  }

  if (!data.user) {
    throw new ApiError(400, 'Account could not be created');
  }

  if (!supabaseAdmin) {
    throw new ApiError(503, 'Server profile setup is not configured');
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({ id: data.user.id, username });

  if (profileError) {
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
  const authenticatedClient = supabase;
  const { error } = await authenticatedClient.auth.signOut({ scope: 'local' });

  if (error) throw new ApiError(400, error.message);
  return { signedOut: true, accessTokenPresent: Boolean(accessToken) };
}