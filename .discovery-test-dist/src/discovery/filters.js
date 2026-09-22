"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStoryEligibleForDiscovery = isStoryEligibleForDiscovery;
exports.diversify = diversify;
exports.storyCard = storyCard;
const config_1 = require("./config");
// SQL discovery_eligible is authoritative; this also guards cached/test data.
function isStoryEligibleForDiscovery(s, blocked = new Set(), allowMature = false) {
    return s.status === 'published' && s.visibility === 'public' && s.moderation_status === 'approved'
        && s.author_active && s.chapters_published > 0 && !blocked.has(s.author_id) && (allowMature || !s.is_mature);
}
function diversify(ranked, count, used = new Set(), genreShelf = false) {
    const selected = [], ids = new Set(), authors = new Map(), genres = new Map();
    const take = (s, relaxGenre = false) => {
        if (selected.length >= count || ids.has(s.id) || (authors.get(s.author_id) ?? 0) >= config_1.DISCOVERY_CONFIG.limits.maxAuthor)
            return;
        if (!genreShelf && !relaxGenre && (genres.get(s.genre) ?? 0) >= Math.max(1, Math.ceil(count * config_1.DISCOVERY_CONFIG.limits.maxGenreFraction)))
            return;
        selected.push(s);
        ids.add(s.id);
        authors.set(s.author_id, (authors.get(s.author_id) ?? 0) + 1);
        genres.set(s.genre, (genres.get(s.genre) ?? 0) + 1);
    };
    for (const s of ranked)
        if (!used.has(s.id))
            take(s);
    for (const s of ranked)
        if (!used.has(s.id))
            take(s, true);
    // Limited small-catalog reuse; the per-author cap remains strict.
    if (selected.length < config_1.DISCOVERY_CONFIG.limits.minShelf)
        for (const s of ranked) {
            if (selected.length >= Math.min(count, config_1.DISCOVERY_CONFIG.limits.minShelf))
                break;
            take(s, true);
        }
    return selected;
}
function storyCard(s) {
    const { id, author_id, title, description, cover_url, genre, tags, status, created_at, updated_at, view_count, content_type, author } = s;
    return { id, author_id, title, description, cover_url, genre, tags, status, created_at, updated_at, view_count, content_type, author };
}
