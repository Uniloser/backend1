import { getSupabaseAdmin } from '../config/supabase';
export async function findPreviousChampion() {
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const event = await db.from('community_events').select('id,title,ends_at')
        .eq('status', 'completed').lte('ends_at', now).order('ends_at', { ascending: false }).order('id').limit(1).maybeSingle();
    // Older deployments have no event tables yet: there is no published champion.
    if (event.error?.code === '42P01' || event.error?.code === 'PGRST205')
        return null;
    if (event.error)
        throw event.error;
    if (!event.data)
        return null;
    const result = await db.from('event_champions').select('university_id,winning_year,verified_at')
        .eq('event_id', event.data.id).lte('verified_at', now).maybeSingle();
    if (result.error)
        throw result.error;
    if (!result.data)
        return null;
    const university = await db.from('event_universities').select('id,name,logo_url,primary_color,secondary_color')
        .eq('id', result.data.university_id).maybeSingle();
    if (university.error)
        throw university.error;
    if (!university.data)
        return null;
    return { event: event.data, result: result.data, university: university.data };
}
