"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.daysAgo = void 0;
exports.trendingScore = trendingScore;
exports.risingScore = risingScore;
exports.qualityScore = qualityScore;
exports.hiddenGemScore = hiddenGemScore;
exports.buildProfile = buildProfile;
exports.recommendationScore = recommendationScore;
const config_1 = require("./config");
const DAY = 86400000;
const daysAgo = (date, now = Date.now()) => Math.max(0, (now - (Date.parse(date) || now)) / DAY);
exports.daysAgo = daysAgo;
const clamp = (n) => Math.min(1, Math.max(0, Number(n) || 0));
function trendingScore(m, now = Date.now()) {
    const w = config_1.DISCOVERY_CONFIG.trending;
    return (m.readers_7d * w.readers + m.likes_7d * w.likes + m.bookmarks_7d * w.bookmarks + m.comments_7d * w.comments + m.followers_7d * w.followers) / (1 + (0, exports.daysAgo)(m.last_activity_at, now) * w.decay);
}
function risingScore(m, now = Date.now()) {
    const w = config_1.DISCOVERY_CONFIG.rising;
    if ((0, exports.daysAgo)(m.published_at, now) > w.maxAgeDays || m.readers_7d < w.minReaders)
        return 0;
    const growth = Math.log1p(m.readers_7d / (m.readers_previous_7d + w.growthPrior)) * Math.log1p(m.readers_7d);
    return m.readers_7d * w.readers + m.likes_7d * w.likes + m.bookmarks_7d * w.bookmarks + m.comments_7d * w.comments + m.followers_7d * w.followers + clamp(m.retention_rate) * w.retention + growth * w.growth;
}
function qualityScore(m) {
    const w = config_1.DISCOVERY_CONFIG.hiddenGems;
    const smooth = (rate) => (clamp(rate) * m.unique_readers + w.priorReaders * w.priorRate) / (m.unique_readers + w.priorReaders);
    const rate = (count) => count / Math.max(1, m.unique_readers);
    return smooth(m.completion_rate) * w.completion + smooth(m.retention_rate) * w.retention + smooth(rate(m.bookmarks)) * w.bookmarks + smooth(rate(m.likes)) * w.likes + smooth(rate(m.comments)) * w.comments;
}
function hiddenGemScore(m) {
    return m.unique_readers >= config_1.DISCOVERY_CONFIG.hiddenGems.minReaders && m.unique_readers < config_1.DISCOVERY_CONFIG.hiddenGems.maxReaders ? qualityScore(m) : 0;
}
function buildProfile(signals, followed, preferences, now = Date.now()) {
    const p = { genres: {}, tags: {}, authors: {}, consumed: new Set(), abandoned: new Set(), signals, personalized: signals.length > 0 || followed.length > 0 || preferences.genres.length > 0 || preferences.tags.length > 0 };
    const add = (map, key, weight) => { const k = key.toLowerCase(); map[k] = (map[k] ?? 0) + weight; };
    const w = config_1.DISCOVERY_CONFIG.interests;
    for (const s of signals) {
        if (s.started || s.completed)
            p.consumed.add(s.story_id);
        if (s.abandoned)
            p.abandoned.add(s.story_id);
        const weight = ((s.opened ? w.open : 0) + Math.min(s.chapters_read, 3) * w.chapter + (s.chapters_read >= 2 ? w.multiple : 0) + (s.liked ? w.like : 0) + (s.bookmarked ? w.bookmark : 0) + (s.completed ? w.complete : 0)) * Math.pow(0.5, (0, exports.daysAgo)(s.occurred_at, now) / w.halfLifeDays);
        add(p.genres, s.genre, weight);
        add(p.authors, s.author_id, weight);
        for (const tag of s.tags ?? [])
            add(p.tags, tag, weight);
    }
    for (const author of followed)
        add(p.authors, author, w.follow);
    for (const map of [p.genres, p.tags, p.authors])
        for (const key of Object.keys(map))
            map[key] /= map[key] + w.prior;
    const explicit = 0.7 / (1 + signals.length / 10);
    for (const g of preferences.genres)
        p.genres[g.toLowerCase()] = Math.max(p.genres[g.toLowerCase()] ?? 0, explicit);
    for (const t of preferences.tags)
        p.tags[t.toLowerCase()] = Math.max(p.tags[t.toLowerCase()] ?? 0, explicit);
    return p;
}
function recommendationScore(s, p, collaborative = 0, now = Date.now()) {
    const w = config_1.DISCOVERY_CONFIG.recommendation;
    const genre = p.genres[s.genre.toLowerCase()] ?? 0;
    const tags = s.tags.length ? s.tags.reduce((sum, t) => sum + (p.tags[t.toLowerCase()] ?? 0), 0) / s.tags.length : 0;
    const fresh = 1 / (1 + (0, exports.daysAgo)(s.last_chapter_published_at, now) * config_1.DISCOVERY_CONFIG.trending.decay);
    const global = qualityScore(s.metrics) * w.quality + fresh * w.freshness;
    const momentum = Math.log1p(trendingScore(s.metrics, now));
    const relevance = p.personalized ? genre * w.genre + tags * w.tags + clamp(collaborative) * w.collaborative + (p.authors[s.author_id] ?? 0) * w.author : momentum / (1 + momentum) * (w.genre + w.tags + w.collaborative + w.author);
    return (global + relevance) * (p.abandoned.has(s.id) ? 0.25 : 1);
}
