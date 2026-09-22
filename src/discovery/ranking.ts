import { DISCOVERY_CONFIG as C } from './config';
import type { Candidate, Metrics, Preferences, Profile, Signal } from './types';
const DAY = 86400000;
export const daysAgo = (date: string, now = Date.now()) => Math.max(0, (now - (Date.parse(date) || now)) / DAY);
const clamp = (n: number) => Math.min(1, Math.max(0, Number(n) || 0));
export function trendingScore(m: Metrics, now = Date.now()) {
  const w = C.trending;
  return (m.readers_7d * w.readers + m.likes_7d * w.likes + m.bookmarks_7d * w.bookmarks + m.comments_7d * w.comments + m.followers_7d * w.followers) / (1 + daysAgo(m.last_activity_at, now) * w.decay);
}
export function risingScore(m: Metrics, now = Date.now()) {
  const w = C.rising;
  if (daysAgo(m.published_at, now) > w.maxAgeDays || m.readers_7d < w.minReaders) return 0;
  const growth = Math.log1p(m.readers_7d / (m.readers_previous_7d + w.growthPrior)) * Math.log1p(m.readers_7d);
  return m.readers_7d * w.readers + m.likes_7d * w.likes + m.bookmarks_7d * w.bookmarks + m.comments_7d * w.comments + m.followers_7d * w.followers + clamp(m.retention_rate) * w.retention + growth * w.growth;
}
export function qualityScore(m: Metrics) {
  const w = C.hiddenGems;
  const smooth = (rate: number) => (clamp(rate) * m.unique_readers + w.priorReaders * w.priorRate) / (m.unique_readers + w.priorReaders);
  const rate = (count: number) => count / Math.max(1, m.unique_readers);
  return smooth(m.completion_rate) * w.completion + smooth(m.retention_rate) * w.retention + smooth(rate(m.bookmarks)) * w.bookmarks + smooth(rate(m.likes)) * w.likes + smooth(rate(m.comments)) * w.comments;
}
export function hiddenGemScore(m: Metrics) {
  return m.unique_readers >= C.hiddenGems.minReaders && m.unique_readers < C.hiddenGems.maxReaders ? qualityScore(m) : 0;
}
export function buildProfile(signals: Signal[], followed: string[], preferences: Preferences, now = Date.now()): Profile {
  const p: Profile = { genres: {}, tags: {}, authors: {}, consumed: new Set(), abandoned: new Set(), signals, personalized: signals.length > 0 || followed.length > 0 || preferences.genres.length > 0 || preferences.tags.length > 0 };
  const add = (map: Record<string, number>, key: string, weight: number) => { const k = key.toLowerCase(); map[k] = (map[k] ?? 0) + weight; };
  const w = C.interests;
  for (const s of signals) {
    if (s.started || s.completed) p.consumed.add(s.story_id);
    if (s.abandoned) p.abandoned.add(s.story_id);
    const weight = ((s.opened ? w.open : 0) + Math.min(s.chapters_read, 3) * w.chapter + (s.chapters_read >= 2 ? w.multiple : 0) + (s.liked ? w.like : 0) + (s.bookmarked ? w.bookmark : 0) + (s.completed ? w.complete : 0)) * Math.pow(0.5, daysAgo(s.occurred_at, now) / w.halfLifeDays);
    add(p.genres, s.genre, weight); add(p.authors, s.author_id, weight);
    for (const tag of s.tags ?? []) add(p.tags, tag, weight);
  }
  for (const author of followed) add(p.authors, author, w.follow);
  for (const map of [p.genres, p.tags, p.authors]) for (const key of Object.keys(map)) map[key] /= map[key] + w.prior;
  const explicit = 0.7 / (1 + signals.length / 10);
  for (const g of preferences.genres) p.genres[g.toLowerCase()] = Math.max(p.genres[g.toLowerCase()] ?? 0, explicit);
  for (const t of preferences.tags) p.tags[t.toLowerCase()] = Math.max(p.tags[t.toLowerCase()] ?? 0, explicit);
  return p;
}
export function recommendationScore(s: Candidate, p: Profile, collaborative = 0, now = Date.now()) {
  const w = C.recommendation;
  const genre = p.genres[s.genre.toLowerCase()] ?? 0;
  const tags = s.tags.length ? s.tags.reduce((sum, t) => sum + (p.tags[t.toLowerCase()] ?? 0), 0) / s.tags.length : 0;
  const fresh = 1 / (1 + daysAgo(s.last_chapter_published_at, now) * C.trending.decay);
  const global = qualityScore(s.metrics) * w.quality + fresh * w.freshness;
  const momentum = Math.log1p(trendingScore(s.metrics, now));
  const relevance = p.personalized ? genre * w.genre + tags * w.tags + clamp(collaborative) * w.collaborative + (p.authors[s.author_id] ?? 0) * w.author : momentum / (1 + momentum) * (w.genre + w.tags + w.collaborative + w.author);
  return (global + relevance) * (p.abandoned.has(s.id) ? 0.25 : 1);
}
