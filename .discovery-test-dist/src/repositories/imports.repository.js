"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountImports = deleteAccountImports;
exports.createImport = createImport;
exports.findImportById = findImportById;
exports.updateImport = updateImport;
// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Repository
// ─────────────────────────────────────────────────────────────────────────────
const supabase_1 = require("../config/supabase");
// In-memory fallback cache
const memoryImports = new Map();
async function deleteAccountImports(userId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)().from('manuscript_imports').delete().eq('user_id', userId);
    if (error && error.code !== 'PGRST205' && error.code !== '42P01')
        throw error;
    for (const [id, record] of memoryImports)
        if (record.user_id === userId)
            memoryImports.delete(id);
}
function getDbClient() {
    try {
        return (0, supabase_1.getSupabaseAdmin)();
    }
    catch {
        return supabase_1.supabase;
    }
}
async function createImport(record) {
    memoryImports.set(record.id, record);
    try {
        const client = getDbClient();
        const { data, error } = await client
            .from('manuscript_imports')
            .insert(record)
            .select()
            .single();
        if (!error && data) {
            return data;
        }
    }
    catch (err) {
        console.warn('[ImportsRepository] Supabase insert notice (using memory cache):', err);
    }
    return record;
}
async function findImportById(importId, userId) {
    const memoryRecord = memoryImports.get(importId);
    if (memoryRecord && memoryRecord.user_id === userId) {
        return memoryRecord;
    }
    try {
        const client = getDbClient();
        const { data, error } = await client
            .from('manuscript_imports')
            .select('*')
            .eq('id', importId)
            .eq('user_id', userId)
            .single();
        if (!error && data) {
            return data;
        }
    }
    catch (err) {
        console.warn('[ImportsRepository] Supabase find notice:', err);
    }
    return memoryRecord ?? null;
}
async function updateImport(importId, status, extra = {}) {
    const existing = memoryImports.get(importId);
    if (existing) {
        const updated = {
            ...existing,
            status,
            updated_at: new Date().toISOString(),
            ...extra,
        };
        memoryImports.set(importId, updated);
    }
    try {
        const client = getDbClient();
        await client
            .from('manuscript_imports')
            .update({
            status,
            updated_at: new Date().toISOString(),
            ...extra,
        })
            .eq('id', importId);
    }
    catch (err) {
        console.warn('[ImportsRepository] Supabase update notice:', err);
    }
}
