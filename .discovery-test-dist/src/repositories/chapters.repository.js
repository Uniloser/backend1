"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findStoryOwner = findStoryOwner;
exports.findChapter = findChapter;
exports.listChapters = listChapters;
exports.createChapter = createChapter;
exports.findNextChapterOrder = findNextChapterOrder;
exports.updateChapter = updateChapter;
exports.deleteChapter = deleteChapter;
exports.resequenceChapters = resequenceChapters;
exports.reorderChapters = reorderChapters;
exports.getAutosave = getAutosave;
exports.saveAutosave = saveAutosave;
const supabase_1 = require("../config/supabase");
async function findStoryOwner(storyId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('stories')
        .select('author_id, content_type')
        .eq('id', storyId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function findChapter(chapterId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function listChapters(storyId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('chapter_order', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
async function createChapter(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .insert(input)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function findNextChapterOrder(storyId) {
    const chapters = await listChapters(storyId);
    return chapters.reduce((highestOrder, chapter) => (Math.max(highestOrder, chapter.chapter_order)), 0) + 1;
}
async function updateChapter(chapterId, input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .update(input)
        .eq('id', chapterId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function deleteChapter(chapterId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .delete()
        .eq('id', chapterId);
    if (error)
        throw error;
}
async function resequenceChapters(storyId) {
    const chapters = await listChapters(storyId);
    for (let index = 0; index < chapters.length; index += 1) {
        const chapter = chapters[index];
        if (chapter.chapter_order === index + 1) {
            continue;
        }
        const { error } = await (0, supabase_1.getSupabaseAdmin)()
            .from('chapters')
            .update({ chapter_order: index + 1 })
            .eq('id', chapter.id)
            .eq('story_id', storyId);
        if (error)
            throw error;
    }
}
async function reorderChapters(storyId, chapters) {
    for (const chapter of chapters) {
        const { error } = await (0, supabase_1.getSupabaseAdmin)()
            .from('chapters')
            .update({ chapter_order: chapter.chapter_order })
            .eq('id', chapter.id)
            .eq('story_id', storyId);
        if (error)
            throw error;
    }
}
async function getAutosave(chapterId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .select('autosave_content, autosaved_at')
        .eq('id', chapterId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function saveAutosave(chapterId, content) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('chapters')
        .update({ autosave_content: content, autosaved_at: new Date().toISOString() })
        .eq('id', chapterId)
        .select('id, autosaved_at')
        .single();
    if (error)
        throw error;
    return data;
}
// Chapters-table repository stub.
// TODO: implement chapter CRUD, published/author-scoped reads, atomic next
// chapter_order allocation, batch reorder, and safe resequencing after delete.
