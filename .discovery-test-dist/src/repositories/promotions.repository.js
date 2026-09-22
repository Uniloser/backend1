"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listByAuthor = listByAuthor;
exports.create = create;
const supabase_1 = require("../config/supabase");
const promotionSelect = 'id, author_id, story_id, title, description, image_url, background_image_url, button_text, promotion_type, status, budget, spent, priority, starts_at, ends_at, is_active, story:stories!story_ads_story_id_fkey(id, title, status, author_id, cover_url)';
async function listByAuthor(authorId) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)().from('story_ads').select(promotionSelect).eq('author_id', authorId).order('created_at', { ascending: false });
    if (error)
        throw error;
    return data ?? [];
}
async function create(input) {
    const { data, error } = await (0, supabase_1.getSupabaseAdmin)().from('story_ads').insert(input).select(promotionSelect).single();
    if (error)
        throw error;
    return data;
}
