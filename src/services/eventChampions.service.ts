import { findPreviousChampion } from '../repositories/eventChampions.repository';
export function publicChampion(record: any, now = Date.now()) {
    if (!record)
        return null;
    const { event, result, university } = record;
    if (!event || !result || !university || !university.id || !event.id)
        return null;
    const completed = Date.parse(event.ends_at), verified = Date.parse(result.verified_at);
    if (!Number.isFinite(completed) || !Number.isFinite(verified) || completed > now || verified > now || verified < completed)
        return null;
    if (!/^https:\/\//.test(university.logo_url) || !/^#[0-9a-f]{6}$/i.test(university.primary_color) || !/^#[0-9a-f]{6}$/i.test(university.secondary_color))
        return null;
    if (!university.name?.trim() || !event.title?.trim() || !Number.isInteger(result.winning_year))
        return null;
    return { eventId: event.id, universityId: university.id, universityName: university.name,
        universityLogoUrl: university.logo_url, primaryColor: university.primary_color, secondaryColor: university.secondary_color,
        eventName: event.title, winningYear: result.winning_year, verifiedAt: result.verified_at, completedAt: event.ends_at };
}
export async function getPreviousChampion() { return publicChampion(await findPreviousChampion()); }
