"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGenres = listGenres;
exports.findByName = findByName;
const supabase_1 = require("../config/supabase");
async function listGenres() {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('genres')
        .select('id, name, slug')
        .order('name', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
async function findByName(name) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('genres')
        .select('id, name, slug')
        .ilike('name', name.trim())
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
