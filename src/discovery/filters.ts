import { DISCOVERY_CONFIG as C } from './config';
import type { Candidate, StoryCard } from './types';
// SQL discovery_eligible is authoritative; this also guards cached/test data.
export function isStoryEligibleForDiscovery(s: Candidate, blocked = new Set<string>(), allowMature = false) {
  return s.status === 'published' && s.visibility === 'public' && s.moderation_status === 'approved'
    && s.author_active && s.chapters_published > 0 && !blocked.has(s.author_id) && (allowMature || !s.is_mature);
}
export function diversify(ranked: Candidate[], count: number, used = new Set<string>(), genreShelf = false): Candidate[] {
  const selected: Candidate[] = [], ids = new Set<string>(), authors = new Map<string, number>(), genres = new Map<string, number>();
  const take = (s: Candidate, relaxGenre = false) => {
    if (selected.length >= count || ids.has(s.id) || (authors.get(s.author_id) ?? 0) >= C.limits.maxAuthor) return;
    if (!genreShelf && !relaxGenre && (genres.get(s.genre) ?? 0) >= Math.max(1, Math.ceil(count * C.limits.maxGenreFraction))) return;
    selected.push(s); ids.add(s.id); authors.set(s.author_id, (authors.get(s.author_id) ?? 0) + 1); genres.set(s.genre, (genres.get(s.genre) ?? 0) + 1);
  };
  for (const s of ranked) if (!used.has(s.id)) take(s);
  for (const s of ranked) if (!used.has(s.id)) take(s, true);
  // Limited small-catalog reuse; the per-author cap remains strict.
  if (selected.length < C.limits.minShelf) for (const s of ranked) { if (selected.length >= Math.min(count, C.limits.minShelf)) break; take(s, true); }
  return selected;
}
export function storyCard(s: Candidate): StoryCard {
  const { id, author_id, title, description, cover_url, genre, tags, status, created_at, updated_at, view_count, content_type, author } = s;
  return { id, author_id, title, description, cover_url, genre, tags, status, created_at, updated_at, view_count, content_type, author };
}
