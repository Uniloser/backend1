"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assemble = assemble;
const config_1 = require("./config");
const filters_1 = require("./filters");
const ranking_1 = require("./ranking");
function assemble(pool, profile, collaborative, options) {
    const eligible = pool.filter(s => (0, filters_1.isStoryEligibleForDiscovery)(s, options.blocked, options.allowMature) && !options.hidden.has(s.id));
    const rank = (items, score) => [...items].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
    const used = new Set();
    const shelves = [];
    const ordered = {};
    const add = (id, type, title, items, sourceStory) => {
        const selected = (0, filters_1.diversify)(items, options.limit, used, type === 'genre');
        if (!selected.length || ((type === 'genre' || type === 'because_you_read') && selected.length < config_1.DISCOVERY_CONFIG.limits.minShelf))
            return;
        selected.forEach(s => used.add(s.id));
        // Keep the remaining ranking frozen for cursor pagination. No repeats within this shelf.
        const selectedIds = new Set(selected.map(s => s.id));
        ordered[id] = [...selected.map(s => s.id), ...items.filter(s => !selectedIds.has(s.id)).map(s => s.id)];
        ordered[id] = [...new Set(ordered[id])];
        shelves.push({ id, type, title, stories: selected.map(filters_1.storyCard), ...(sourceStory ? { sourceStory } : {}) });
    };
    const freshRecommendations = eligible.filter(s => !profile.consumed.has(s.id));
    const recommended = rank(freshRecommendations, s => (0, ranking_1.recommendationScore)(s, profile, collaborative.get(s.id), options.now));
    const explore = rank(freshRecommendations.filter(s => (0, ranking_1.daysAgo)(s.published_at, options.now) <= config_1.DISCOVERY_CONFIG.exploration.maxAgeDays && s.cover_url?.trim() && s.description?.trim() && s.title.trim()), s => Date.parse(s.published_at));
    // Reserve a small deterministic portion before reranking; eligibility and author caps still apply.
    const count = Math.min(explore.length, Math.floor(options.limit * config_1.DISCOVERY_CONFIG.exploration.fraction));
    const explorationIds = new Set(explore.slice(0, count).map(s => s.id));
    add('for_you', 'for_you', 'For You', [...explore.slice(0, count), ...recommended.filter(s => !explorationIds.has(s.id))]);
    add('trending', 'trending', 'Trending Now', rank(eligible.filter(s => (0, ranking_1.trendingScore)(s.metrics, options.now) > 0), s => (0, ranking_1.trendingScore)(s.metrics, options.now)));
    add('rising', 'rising', 'New & Rising', rank(eligible.filter(s => (0, ranking_1.risingScore)(s.metrics, options.now) > 0), s => (0, ranking_1.risingScore)(s.metrics, options.now)));
    const source = profile.signals.find(s => s.chapters_read >= 2 || s.liked || s.bookmarked || s.completed);
    if (source && eligible.some(s => s.id === source.story_id)) {
        const seed = eligible.find(s => s.id === source.story_id);
        const similar = freshRecommendations.filter(s => s.id !== source.story_id && (options.similar.has(s.id) || s.genre === seed.genre || s.tags.some(t => seed.tags.includes(t))));
        add('because_you_read', 'because_you_read', `Because You Read ${source.title}`, rank(similar, s => (options.similar.get(s.id) ?? 0) + (0, ranking_1.recommendationScore)(s, profile, 0, options.now)), { id: source.story_id, title: source.title });
    }
    add('hidden_gems', 'hidden_gems', 'Hidden Gems', rank(eligible.filter(s => (0, ranking_1.hiddenGemScore)(s.metrics) > 0), s => (0, ranking_1.hiddenGemScore)(s.metrics)));
    add('recently_updated', 'recently_updated', 'Recently Updated', rank(eligible, s => Date.parse(s.last_chapter_published_at)));
    const genreScores = options.genreNames.map(name => ({ name, score: profile.genres[name.toLowerCase()] ?? eligible.filter(s => s.genre === name).reduce((sum, s) => sum + (0, ranking_1.trendingScore)(s.metrics, options.now), 0) / (1 + eligible.length) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    let genresAdded = 0;
    for (const { name } of genreScores) {
        if (genresAdded >= config_1.DISCOVERY_CONFIG.limits.genreShelves)
            break;
        const before = shelves.length;
        add(`genre:${name}`, 'genre', profile.personalized ? `${name} For You` : `Popular ${name}`, rank(eligible.filter(s => s.genre === name), s => (0, ranking_1.recommendationScore)(s, profile, 0, options.now) + Math.log1p((0, ranking_1.trendingScore)(s.metrics, options.now))));
        if (shelves.length > before)
            genresAdded++;
    }
    return { shelves, ordered };
}
