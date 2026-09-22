"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReport = createReport;
const supabase_1 = require("../config/supabase");
async function createReport(reporterId, input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('reports')
        .insert({ reporter_id: reporterId, ...input })
        .select('id, category, description, status, priority, created_at')
        .single();
    if (error)
        throw error;
    return data;
}
