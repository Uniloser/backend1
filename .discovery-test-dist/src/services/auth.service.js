"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUp = signUp;
exports.signIn = signIn;
exports.signOut = signOut;
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
async function signUp(email, password, username) {
    const { data, error } = await supabase_1.supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: env_1.env.frontendUrl,
            data: { username },
        },
    });
    if (error) {
        const errorDetails = error;
        const isRateLimited = errorDetails.status === 429
            || errorDetails.code === 'over_email_send_rate_limit'
            || /rate limit|too many requests|email.*send/i.test(errorDetails.message);
        if (isRateLimited) {
            throw new ApiError_1.ApiError(429, 'Too many confirmation emails were requested. Please wait and try again later.');
        }
        throw new ApiError_1.ApiError(400, errorDetails.message);
    }
    if (!data.user) {
        throw new ApiError_1.ApiError(400, 'Account could not be created');
    }
    if (!supabase_1.supabaseAdmin) {
        throw new ApiError_1.ApiError(503, 'Server profile setup is not configured');
    }
    const { error: profileError } = await supabase_1.supabaseAdmin
        .from('users')
        .insert({ id: data.user.id, username });
    if (profileError) {
        if (profileError.code === '23505') {
            throw new ApiError_1.ApiError(409, 'That username is already taken');
        }
        throw new ApiError_1.ApiError(400, 'Account profile could not be created');
    }
    return data;
}
async function signIn(email, password) {
    const { data, error } = await supabase_1.supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw new ApiError_1.ApiError(401, 'Invalid email or password');
    return data;
}
async function signOut(accessToken) {
    const authenticatedClient = supabase_1.supabase;
    const { error } = await authenticatedClient.auth.signOut({ scope: 'local' });
    if (error)
        throw new ApiError_1.ApiError(400, error.message);
    return { signedOut: true, accessTokenPresent: Boolean(accessToken) };
}
