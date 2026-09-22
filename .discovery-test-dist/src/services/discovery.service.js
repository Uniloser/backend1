"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.getSession = getSession;
exports.discover = discover;
exports.loadMore = loadMore;
exports.track = track;
exports.getSimilarStories = getSimilarStories;
const repository = __importStar(require("../repositories/discovery.repository"));
const config_1 = require("../discovery/config");
const cache_1 = require("../discovery/cache");
const ranking_1 = require("../discovery/ranking");
const assemble_1 = require("../discovery/assemble");
const filters_1 = require("../discovery/filters");
const ApiError_1 = require("../utils/ApiError");
const { randomUUID } = require('node:crypto');
const { Buffer } = require('node:buffer');
const sessionKey = (id) => `discovery:session:${id}`;
const meaningful = (s) => s.chapters_read >= 2 || s.liked || s.bookmarked || s.completed;
function normalized(rows) {
    const max = Math.max(1, ...rows.map(r => r.score));
    return new Map(rows.map(r => [r.story_id, r.score / max]));
}
function encodeCursor(sessionId, shelf, offset) { return Buffer.from(JSON.stringify({ sessionId, shelf, offset })).toString('base64url'); }
function decodeCursor(cursor) {
    try {
        const value = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (!/^[0-9a-f-]{36}$/i.test(value.sessionId) || typeof value.shelf !== 'string' || value.shelf.length > 100 || !Number.isInteger(value.offset) || value.offset < 0 || value.offset > config_1.DISCOVERY_CONFIG.limits.maxOffset)
            throw new Error();
        return value;
    }
    catch {
        throw new ApiError_1.ApiError(400, 'Invalid discovery cursor');
    }
}
async function getSession(id, userId) {
    const session = await (0, cache_1.cacheGet)(sessionKey(id));
    if (!session || session.owner !== (userId ?? null))
        throw new ApiError_1.ApiError(410, 'Discovery session expired. Refresh discovery.');
    return session;
}
async function discover(userId, limit = config_1.DISCOVERY_CONFIG.limits.shelf) {
    const ctx = await repository.context(userId);
    ctx.signals = ctx.signals.filter(s => !ctx.blocked.has(s.author_id) && !ctx.hidden.has(s.story_id));
    const profile = (0, ranking_1.buildProfile)(ctx.signals, ctx.followed, ctx.preferences);
    let global = await (0, cache_1.cacheGet)(`discovery:global:${config_1.DISCOVERY_CONFIG.version}`);
    if (!global) {
        global = [...new Set((await Promise.all(['trending', 'rising', 'hidden_gems', 'recently_updated', 'new'].map(repository.globalIds))).flat())];
        await (0, cache_1.cacheSet)(`discovery:global:${config_1.DISCOVERY_CONFIG.version}`, global, config_1.DISCOVERY_CONFIG.cache.globalSeconds);
    }
    const genres = await repository.genres();
    const topGenres = genres.filter(g => profile.genres[g.name.toLowerCase()]).sort((a, b) => (profile.genres[b.name.toLowerCase()] ?? 0) - (profile.genres[a.name.toLowerCase()] ?? 0)).slice(0, config_1.DISCOVERY_CONFIG.limits.genreShelves).map(g => g.name);
    const topTags = Object.entries(profile.tags).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
    const seeds = ctx.signals.filter(meaningful).slice(0, 5).map(s => s.story_id);
    const [interests, collaborative, similar] = await Promise.all([
        repository.interestIds(topGenres, topTags, ctx.followed), repository.collaborative(seeds, userId), repository.collaborative(seeds.slice(0, 1), userId),
    ]);
    const pool = await repository.hydrate([...global, ...interests, ...collaborative.map(r => r.story_id), ...similar.map(r => r.story_id), ...seeds]);
    const now = Date.now();
    const { shelves, ordered } = (0, assemble_1.assemble)(pool, profile, normalized(collaborative), { blocked: ctx.blocked, hidden: ctx.hidden, allowMature: ctx.preferences.allowMature, limit, now, genreNames: genres.map(g => g.name), similar: normalized(similar) });
    const id = randomUUID();
    for (const shelf of shelves) {
        shelf.nextCursor = ordered[shelf.id].length > shelf.stories.length ? encodeCursor(id, shelf.id, shelf.stories.length) : null;
        shelf.positions = Object.fromEntries(shelf.stories.map(s => [s.id, ordered[shelf.id].indexOf(s.id)]));
    }
    const generatedAt = new Date(now).toISOString();
    await (0, cache_1.cacheSet)(sessionKey(id), { owner: userId ?? null, generatedAt, personalized: profile.personalized, ordered, shelves }, config_1.DISCOVERY_CONFIG.cache.sessionSeconds);
    return { userPersonalized: profile.personalized, generatedAt, recommendationSessionId: id, shelves };
}
async function loadMore(cursor, userId, limit = config_1.DISCOVERY_CONFIG.limits.shelf) {
    const { sessionId, shelf: id, offset } = decodeCursor(cursor);
    const session = await getSession(sessionId, userId), shelf = session.shelves.find(s => s.id === id);
    if (!shelf || offset > session.ordered[id].length)
        throw new ApiError_1.ApiError(400, 'Invalid discovery shelf cursor');
    const ctx = await repository.context(userId);
    const ids = session.ordered[id];
    const candidates = await repository.hydrate(ids.slice(offset, config_1.DISCOVERY_CONFIG.limits.maxOffset));
    const byId = new Map(candidates.map(s => [s.id, s]));
    const consumed = new Set(ctx.signals.filter(s => s.started || s.completed).map(s => s.story_id));
    const selected = [], authors = new Map();
    let next = offset;
    while (next < Math.min(ids.length, config_1.DISCOVERY_CONFIG.limits.maxOffset) && selected.length < limit) {
        const s = byId.get(ids[next++]);
        if (!s || !(0, filters_1.isStoryEligibleForDiscovery)(s, ctx.blocked, ctx.preferences.allowMature) || ctx.hidden.has(s.id) || ((shelf.type === 'for_you' || shelf.type === 'because_you_read') && consumed.has(s.id)))
            continue;
        if ((authors.get(s.author_id) ?? 0) >= config_1.DISCOVERY_CONFIG.limits.maxAuthor)
            continue;
        authors.set(s.author_id, (authors.get(s.author_id) ?? 0) + 1);
        selected.push(s);
    }
    // Recheck source metadata too: it may have been unpublished or blocked after page one.
    let sourceStory = shelf.sourceStory;
    if (sourceStory) {
        const [source] = await repository.hydrate([sourceStory.id]);
        if (!source || !(0, filters_1.isStoryEligibleForDiscovery)(source, ctx.blocked, ctx.preferences.allowMature) || ctx.hidden.has(source.id))
            throw new ApiError_1.ApiError(410, 'Discovery source is no longer available. Refresh discovery.');
        sourceStory = { id: source.id, title: source.title };
    }
    return { userPersonalized: session.personalized, generatedAt: session.generatedAt, recommendationSessionId: sessionId, shelves: [{ ...shelf, ...(sourceStory ? { sourceStory, title: `Because You Read ${sourceStory.title}` } : {}), stories: selected.map(filters_1.storyCard), positions: Object.fromEntries(selected.map(s => [s.id, ids.indexOf(s.id)])), nextCursor: next < Math.min(ids.length, config_1.DISCOVERY_CONFIG.limits.maxOffset) ? encodeCursor(sessionId, id, next) : null }] };
}
async function track(userId, input) {
    const session = await getSession(input.sessionId, userId);
    const events = input.events.map(e => {
        const ids = session.ordered[e.shelf];
        if (!ids || (e.event !== 'discovery_shelf_view' && (!e.storyId || e.position === undefined || ids[e.position] !== e.storyId)))
            throw new ApiError_1.ApiError(400, 'Event does not match this discovery session');
        return { event_type: e.event, story_id: e.storyId, metadata: { source: 'discovery', shelf: e.shelf, position: e.position, sessionId: input.sessionId } };
    });
    await repository.recordEvents(userId, events);
    return { recorded: events.length };
}
async function getSimilarStories(storyId, userId, limit = 8) {
    const ctx = await repository.context(userId);
    const [source] = await repository.hydrate([storyId]);
    if (!source || !(0, filters_1.isStoryEligibleForDiscovery)(source, ctx.blocked, ctx.preferences.allowMature) || ctx.hidden.has(storyId))
        return [];
    const [overlap, interests] = await Promise.all([repository.collaborative([storyId], userId), repository.interestIds([source.genre], source.tags, [])]);
    const pool = await repository.hydrate([...overlap.map(s => s.story_id), ...interests]);
    const profile = (0, ranking_1.buildProfile)(ctx.signals, ctx.followed, { ...ctx.preferences, genres: [source.genre], tags: source.tags });
    const scores = normalized(overlap);
    return (0, filters_1.diversify)(pool.filter(s => s.id !== storyId && !profile.consumed.has(s.id) && !ctx.hidden.has(s.id) && (0, filters_1.isStoryEligibleForDiscovery)(s, ctx.blocked, ctx.preferences.allowMature)).sort((a, b) => (0, ranking_1.recommendationScore)(b, profile, scores.get(b.id)) - (0, ranking_1.recommendationScore)(a, profile, scores.get(a.id)) || a.id.localeCompare(b.id)), limit).map(filters_1.storyCard);
}
