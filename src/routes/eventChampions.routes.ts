const { Router } = require('express') as {
    Router: () => any;
};
import { optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPreviousChampion } from '../services/eventChampions.service';
import { getSupabaseAdmin } from '../config/supabase';
const router = Router();
router.get('/events', optionalAuth, asyncHandler(async (_request: any, response: any) => {
    const result = await getSupabaseAdmin().from('community_events')
        .select('id,title,description,theme,rules,prizes,starts_at,ends_at,voting_starts_at,voting_ends_at,status')
        .in('status', ['upcoming', 'live', 'completed']).not('starts_at', 'is', null)
        .order('starts_at', { ascending: false }).limit(200);
    if (result.error && !['42P01', '42703', 'PGRST204', 'PGRST205'].includes(result.error.code)) throw result.error;
    const now = Date.now();
    const events = (result.data || []).map((event: any) => ({ ...event,
        status: event.status === 'completed' || Date.parse(event.ends_at) <= now ? 'completed'
            : Date.parse(event.starts_at) > now ? 'upcoming' : 'live',
    }));
    response.set('Cache-Control', 'no-store');
    response.json({ data: events });
}));
router.get('/events/previous-champion', optionalAuth, asyncHandler(async (_request: any, response: any) => {
    response.set('Cache-Control', 'no-store');
    response.json({ data: await getPreviousChampion() });
}));
export default router;
