"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createView = createView;
exports.incrementStoryViewCount = incrementStoryViewCount;
const supabase_1 = require("../config/supabase");
async function createView(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('story_views')
        .insert({
        story_id: input.story_id,
        user_id: input.user_id ?? null,
        chapter_id: input.chapter_id ?? null,
        session_id: input.session_id ?? null,
        metadata: input.metadata ?? {},
    })
        .select('id, story_id, user_id, chapter_id, session_id, created_at')
        .single();
    if (error)
        throw error;
    return data;
}
async function incrementStoryViewCount(storyId) {
    const { data: story, error: readError } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('view_count')
        .eq('id', storyId)
        .single();
    if (readError)
        throw readError;
    const nextCount = (story?.view_count ?? 0) + 1;
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .update({ view_count: nextCount })
        .eq('id', storyId)
        .select('id, view_count')
        .single();
    if (error)
        throw error;
    return data;
}
