"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findChapterInStory = findChapterInStory;
exports.upsertProgress = upsertProgress;
exports.listLibrary = listLibrary;
const supabase_1 = require("../config/supabase");
async function findChapterInStory(storyId, chapterId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .select('id, story_id')
        .eq('id', chapterId)
        .eq('story_id', storyId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function upsertProgress(userId, storyId, lastChapterId, lastPanelIndex = null) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('reading_progress')
        .upsert({
        user_id: userId,
        story_id: storyId,
        last_chapter_id: lastChapterId,
        last_panel_index: lastPanelIndex,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,story_id' })
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function listLibrary(userId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('reading_progress')
        .select('story_id, last_chapter_id, updated_at, story:stories!reading_progress_story_id_fkey(*)')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
// Reading-progress repository stub.
// TODO: own progress upsert and private user library reads, including resume
// chapter and bookmarked-story data when bookmarks are added to the schema.
