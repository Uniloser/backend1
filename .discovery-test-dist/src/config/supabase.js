"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = exports.supabase = void 0;
exports.getSupabaseAdmin = getSupabaseAdmin;
const env_1 = require("./env");
const ApiError_1 = require("../utils/ApiError");
const { createClient } = require('@supabase/supabase-js');
exports.supabase = createClient(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey);
exports.supabaseAdmin = env_1.env.supabaseServiceRoleKey
    ? createClient(env_1.env.supabaseUrl, env_1.env.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
    : undefined;
function getSupabaseAdmin() {
    if (!exports.supabaseAdmin) {
        throw new ApiError_1.ApiError(503, 'Server database access is not configured');
    }
    return exports.supabaseAdmin;
}
// Supabase client stub.
// TODO: create and export the configured Supabase server client used by
// repositories and auth.middleware.js.
// TODO: keep all database access behind repositories; this file only owns
// client construction and configuration.
