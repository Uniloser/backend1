const { Router } = require('express') as {
    Router: () => any;
};
import { auth, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPreviousChampion } from '../services/eventChampions.service';
import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { z } from 'zod';
const router = Router();
router.get('/events/voting', optionalAuth, asyncHandler(async (request: any, response: any) => {
 const db = getSupabaseAdmin();
 const result = await db.from('community_events').select('id,title,status,starts_at,ends_at,voting_starts_at,voting_ends_at')
  .in('status',['upcoming','live','completed']).not('starts_at','is',null).order('starts_at',{ascending:false}).limit(20);
 if(result.error) throw result.error;
 const boards = await Promise.all((result.data || []).map(async (event: any) => {
  const [entries,counts,mine] = await Promise.all([
   db.from('event_story_entries').select('story:stories!inner(id,title,cover_url,genre,status,visibility,moderation_status)').eq('event_id',event.id)
    .eq('story.status','published').eq('story.visibility','public').eq('story.moderation_status','approved'),
   db.rpc('event_story_vote_counts',{p_event:event.id}),
   request.user ? db.from('event_story_votes').select('story_id').eq('event_id',event.id).eq('user_id',request.user.id).maybeSingle() : Promise.resolve({data:null,error:null})
  ]);
  if(entries.error) throw entries.error; if(counts.error) throw counts.error; if(mine.error) throw mine.error;
  const tally = new Map((counts.data || []).map((item: any) => [item.story_id,Number(item.votes)]));
  const now=Date.now();
  return { ...event, votingOpen: ['live','upcoming'].includes(event.status) && Date.parse(event.starts_at)<=now && Date.parse(event.ends_at)>now && Date.parse(event.voting_starts_at)<=now && Date.parse(event.voting_ends_at)>now,
   myVote:mine.data?.story_id || null,
   entries:(entries.data || []).map((item: any)=>({...item.story,votes:tally.get(item.story.id)||0})).sort((a: any,b: any)=>b.votes-a.votes || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) };
 }));
 response.set('Cache-Control','no-store'); response.json({data:boards});
}));
router.post('/events/:eventId/vote', auth, asyncHandler(async (request: any,response: any) => {
 const eventId=z.string().uuid().parse(request.params.eventId);
 const {storyId}=z.object({storyId:z.string().uuid()}).strict().parse(request.body);
 const result=await getSupabaseAdmin().rpc('cast_event_story_vote',{p_event:eventId,p_story:storyId,p_user:request.user.id});
 if(result.error) throw new ApiError(400,result.error.message);
 response.json({data:{storyId}});
}));
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
