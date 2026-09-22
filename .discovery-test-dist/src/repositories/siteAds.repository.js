"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveAd = findActiveAd;
const supabase_1 = require("../config/supabase");
async function findActiveAd() {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('site_ads')
        .select('id,title,message,bold_text,cta_text,cta_url,presentation')
        .eq('status', 'active')
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
