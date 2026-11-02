const { Router } = require('express') as {
    Router: () => any;
};
import { auth, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPreviousChampion } from '../services/eventChampions.service';
import { getSupabaseAdmin } from '../config/supabase';
import { findCompetition,competitionDetails,checkEventResult } from '../services/eventCompetitions.service';
import { z } from 'zod';
const router = Router();
const eventWriteLimit = require('express-rate-limit')({windowMs:60000,limit:20,standardHeaders:true,legacyHeaders:false,keyGenerator:(req:any)=>req.user.id});
router.get('/events/voting', optionalAuth, asyncHandler(async (request: any,response: any)=>{
 const db=getSupabaseAdmin();
 const events=checkEventResult(await db.from('community_events').select('*').in('status',['upcoming','live','completed']).not('starts_at','is',null).order('starts_at',{ascending:false}).limit(20));
 response.set('Cache-Control','no-store');response.json({data:await Promise.all(events.map((event:any)=>competitionDetails(event,request.user?.id)))});
}));
router.post('/events/:eventId/vote',auth,eventWriteLimit,asyncHandler(async(request:any,response:any)=>{
 const id=z.string().uuid().parse(request.params.eventId);
 const {storyId}=z.object({storyId:z.string().uuid()}).strict().parse(request.body);
 checkEventResult(await getSupabaseAdmin().rpc('cast_event_story_vote',{p_event:id,p_story:storyId,p_user:request.user.id}));
 response.json({data:{storyId}});
}));
router.post('/events/:eventId/entries',auth,eventWriteLimit,asyncHandler(async(request:any,response:any)=>{
 const id=z.string().uuid().parse(request.params.eventId);
 const {storyId}=z.object({storyId:z.string().uuid()}).strict().parse(request.body);
 checkEventResult(await getSupabaseAdmin().rpc('submit_event_story',{p_event:id,p_story:storyId,p_user:request.user.id}));
 response.status(201).json({data:{storyId,status:'pending'}});
}));
router.get('/events/:key/eligible-stories',auth,asyncHandler(async(request:any,response:any)=>{
 const event=await findCompetition(request.params.key);
 const offset=z.coerce.number().int().min(0).max(100000).default(0).parse(request.query.offset);
 let query=getSupabaseAdmin().from('stories').select('id,title,cover_url,genre,description').eq('author_id',request.user.id).eq('status','published').eq('visibility','public').eq('moderation_status','approved').order('id').range(offset,offset+49);
 if(!event.allow_existing_stories){if(!event.entry_starts_at)return response.json({data:[]});query=query.gte('created_at',event.entry_starts_at);}
 response.set('Cache-Control','no-store');response.json({data:checkEventResult(await query)});
}));
router.get('/events', optionalAuth, asyncHandler(async (_request: any, response: any) => {
    const result = await getSupabaseAdmin().from('community_events')
        .select('*')
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
router.get('/events/:key',optionalAuth,asyncHandler(async(request:any,response:any)=>{
 const event=await findCompetition(z.string().min(1).max(200).parse(request.params.key));
 const offset=z.coerce.number().int().min(0).max(100000).default(0).parse(request.query.offset);
 const limit=z.coerce.number().int().min(1).max(100).default(50).parse(request.query.limit);
 response.set('Cache-Control','no-store');response.json({data:await competitionDetails(event,request.user?.id,offset,limit)});
}));
// Public aliases retain the same filtered/paginated DTO for stories, leaderboard and results.
router.get('/events/:key/:section',optionalAuth,asyncHandler(async(request:any,response:any)=>{
 z.enum(['stories','leaderboard','results','vote']).parse(request.params.section);
 const event=await findCompetition(request.params.key);
 const offset=z.coerce.number().int().min(0).max(100000).default(0).parse(request.query.offset);
 const details=await competitionDetails(event,request.user?.id,offset);
 response.set('Cache-Control','no-store');response.json({data:request.params.section==='results'?details.result:request.params.section==='vote'?{storyId:details.myVote,validity:details.myVoteValidity}:details});
}));
export default router;
