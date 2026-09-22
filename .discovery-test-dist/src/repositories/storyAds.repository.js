"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveAd = findActiveAd;
exports.createEvent = createEvent;
const supabase_1 = require("../config/supabase");
async function findActiveAd() {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('story_ads')
        .select('*, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url, description, genre, tags)')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .eq('story.status', 'published')
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw error;
    if (!data || !data.story)
        return null;
    return data;
}
async function createEvent(input) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)().from('story_ad_events').insert({
        ad_id: input.adId,
        event_type: input.eventType,
        user_id: input.userId ?? null,
        session_id: input.sessionId ?? null,
    });
    if (error)
        throw error;
}
