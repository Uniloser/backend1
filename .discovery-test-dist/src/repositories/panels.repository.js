"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPanels = listPanels;
exports.countPanels = countPanels;
exports.countPanelsByChapterIds = countPanelsByChapterIds;
exports.findPanel = findPanel;
exports.findNextPanelOrder = findNextPanelOrder;
exports.createPanel = createPanel;
exports.updatePanel = updatePanel;
exports.deletePanel = deletePanel;
exports.resequencePanels = resequencePanels;
exports.reorderPanels = reorderPanels;
const supabase_1 = require("../config/supabase");
async function listPanels(chapterId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('panel_order', { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
async function countPanels(chapterId) {
    const { count, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .select('id', { count: 'exact', head: true })
        .eq('chapter_id', chapterId);
    if (error)
        throw error;
    return count ?? 0;
}
async function countPanelsByChapterIds(chapterIds) {
    if (chapterIds.length === 0)
        return {};
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .select('chapter_id')
        .in('chapter_id', chapterIds);
    if (error)
        throw error;
    const counts = {};
    for (const row of data ?? []) {
        counts[row.chapter_id] = (counts[row.chapter_id] ?? 0) + 1;
    }
    return counts;
}
async function findPanel(panelId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .select('*')
        .eq('id', panelId)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
async function findNextPanelOrder(chapterId) {
    const panels = await listPanels(chapterId);
    return panels.reduce((highest, panel) => (Math.max(highest, panel.panel_order)), 0) + 1;
}
async function createPanel(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .insert(input)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function updatePanel(panelId, input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .update(input)
        .eq('id', panelId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
async function deletePanel(panelId) {
    const { error } = await (0, supabase_1.getSupabaseAdmin)()
        .from('comic_panels')
        .delete()
        .eq('id', panelId);
    if (error)
        throw error;
}
async function resequencePanels(chapterId) {
    const panels = await listPanels(chapterId);
    for (let index = 0; index < panels.length; index += 1) {
        const panel = panels[index];
        const nextOrder = index + 1;
        if (panel.panel_order === nextOrder) {
            continue;
        }
        const { error } = await (0, supabase_1.getSupabaseAdmin)()
            .from('comic_panels')
            .update({ panel_order: nextOrder })
            .eq('id', panel.id)
            .eq('chapter_id', chapterId);
        if (error)
            throw error;
    }
}
async function reorderPanels(chapterId, panels) {
    for (const panel of panels) {
        const { error } = await (0, supabase_1.getSupabaseAdmin)()
            .from('comic_panels')
            .update({ panel_order: panel.panel_order })
            .eq('id', panel.id)
            .eq('chapter_id', chapterId);
        if (error)
            throw error;
    }
}
