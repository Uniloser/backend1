"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = deleteAccount;
exports.acceptCommunityTerms = acceptCommunityTerms;
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const imports_repository_1 = require("./imports.repository");
// Uploads created by this app are stored under the authenticated user's UUID.
async function deleteAccount(userId) {
    if (!/^[0-9a-f-]{36}$/i.test(userId))
        throw new Error('Invalid account identifier');
    const admin = (0, supabase_1.getSupabaseAdmin)();
    await (0, imports_repository_1.deleteAccountImports)(userId);
    for (const bucket of new Set([env_1.env.coverBucket, env_1.env.avatarBucket, env_1.env.panelBucket])) {
        const storage = admin.storage.from(bucket);
        async function removeFolder(prefix) {
            for (;;) {
                const { data, error } = await storage.list(prefix, { limit: 100, offset: 0 });
                if (error)
                    throw error;
                if (!data?.length)
                    return;
                const files = [];
                for (const entry of data) {
                    if (entry.name.includes('/') || entry.name === '..' || entry.name === '.')
                        throw new Error('Invalid storage path');
                    const path = `${prefix}/${entry.name}`;
                    if (entry.id)
                        files.push(path);
                    else
                        await removeFolder(path);
                }
                if (files.length) {
                    const { error: removeError } = await storage.remove(files);
                    if (removeError)
                        throw removeError;
                }
            }
        }
        await removeFolder(userId);
    }
    // auth.users -> public.users -> stories, chapters, comments, wallet, follows,
    // bookmarks and reading progress use ON DELETE CASCADE in the schema.
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    if (error)
        throw error;
}
async function acceptCommunityTerms(userId, version) {
    const admin = (0, supabase_1.getSupabaseAdmin)();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error)
        throw error;
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: { ...data.user.app_metadata, community_terms_version: version, community_terms_accepted_at: new Date().toISOString() },
    });
    if (updateError)
        throw updateError;
}
