import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
export function competitionStage(event: any, now = Date.now(), published = false) {
 if(published) return 'announced';
 if(['draft','cancelled'].includes(event.status)) return event.status;
 if(event.status==='completed') return 'closed';
 if(!event.starts_at || Date.parse(event.starts_at)>now) return 'upcoming';
 if(event.voting_enabled!==false && Date.parse(event.voting_starts_at)<=now && Date.parse(event.voting_ends_at)>now && Date.parse(event.ends_at)>now) return 'voting';
 if(event.entries_enabled!==false && Date.parse(event.entry_starts_at)<=now && Date.parse(event.entry_ends_at)>now && Date.parse(event.ends_at)>now) return 'entries';
 return 'closed';
}
export function checkEventResult(result: any) { if(result.error) throw new ApiError(400,result.error.message); return result.data; }
export async function findCompetition(key: string) {
 const db=getSupabaseAdmin();
 const field=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key)?'id':'slug';
 const event=checkEventResult(await db.from('community_events').select('*').eq(field,key).in('status',['upcoming','live','completed']).maybeSingle());
 if(!event) throw new ApiError(404,'Event not found');
 return event;
}
export async function competitionDetails(event: any, userId?: string, offset=0, limit=50) {
 const db=getSupabaseAdmin();
 const [entryResult,mineResult,resultResponse,ownEntry] = await Promise.all([
  db.rpc('event_competition_entries',{p_event:event.id}),
  userId?db.from('event_story_votes').select('story_id,validity').eq('event_id',event.id).eq('user_id',userId).maybeSingle():Promise.resolve({data:null}),
  db.from('event_competition_results').select('*').eq('event_id',event.id).maybeSingle(),
  userId?db.from('event_story_entries').select('story_id,eligibility_status,review_note').eq('event_id',event.id).eq('author_id',userId).limit(1).maybeSingle():Promise.resolve({data:null})
 ]);
 const entries=checkEventResult(entryResult)||[],mine=checkEventResult(mineResult), result=checkEventResult(resultResponse), own=checkEventResult(ownEntry);
 const tally=new Map(entries.map((item:any)=>[item.story_id,Number(item.votes)]));
 const frozen=new Map((result?.rankings||[]).map((item:any)=>[item.story_id,Number(item.votes)]));
 const stage=competitionStage(event,Date.now(),Boolean(result?.published_at));
 let rows=entries.map((entry:any)=>({...entry.story,votes:(result?frozen:tally).get(entry.story_id)||0}));
 const publicRanks=event.show_rankings!==false;
 if(publicRanks) rows.sort((a:any,b:any)=>b.votes-a.votes||a.id.localeCompare(b.id));
 const allRows=rows.map((row:any,index:number)=>({...row,rank:publicRanks?index+1:null,votes:event.show_vote_totals!==false?row.votes:null}));
 rows=allRows.slice(offset,offset+limit);
 let publishedResult=null;
 if(result?.published_at) {
  const winner=checkEventResult(await db.from('stories').select('id,title,description,cover_url,author_id,genre,author:users!stories_author_id_fkey(id,username,display_name)').eq('id',result.story_id).eq('status','published').eq('visibility','public').eq('moderation_status','approved').maybeSingle());
  publishedResult={story:winner,verifiedVotes:event.show_vote_totals!==false?result.verified_votes:null,verifiedAt:result.verified_at,publishedAt:result.published_at,rankings:publicRanks?allRows.slice(offset,offset+limit):[]};
 }
 return {...event,stage,votingOpen:stage==='voting',entriesOpen:!result && ['upcoming','live'].includes(event.status) && event.entries_enabled && Date.parse(event.entry_starts_at)<=Date.now() && Date.parse(event.entry_ends_at)>Date.now() && Date.parse(event.ends_at)>Date.now(),verificationStatus:result?.published_at?'published':result?'verified':stage==='closed'?'pending':'not_started',
  myVote:mine?.story_id||null,myVoteValidity:mine?.validity||null,myEntry:own||null,entries:rows,total:entries.length,offset,limit,nextOffset:offset+limit<entries.length?offset+limit:null,result:publishedResult,url:`https://readagora.com/events/${event.slug}`};
}
