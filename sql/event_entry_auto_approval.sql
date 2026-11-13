-- Apply after event_competitions.sql. Safe to reapply.
-- Keep submission eligibility checks and event locking; remove manual entry review.
begin;
create or replace function public.submit_event_story(p_event uuid,p_story uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.community_events; s public.stories; t timestamptz;
begin
 select * into e from public.community_events where id=p_event for update;
 t=clock_timestamp();
 if not found or e.status not in ('upcoming','live') or not e.entries_enabled or e.entry_starts_at is null or e.entry_starts_at>t or e.entry_ends_at<=t or e.ends_at<=t then raise exception 'Entries are not open'; end if;
 if exists(select 1 from public.event_competition_results where event_id=p_event) then raise exception 'Entries or voting are locked during result verification'; end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<t)) then raise exception 'Confirm your email before entering'; end if;
 select * into s from public.stories where id=p_story for share;
 if not found or s.author_id<>p_user or s.status<>'published' or s.visibility<>'public' or s.moderation_status<>'approved' or (not e.allow_existing_stories and s.created_at<e.entry_starts_at) then raise exception 'This story is not eligible'; end if;
 if exists(select 1 from public.event_story_entries where event_id=p_event and author_id=p_user) then raise exception 'You have already entered a story in this event'; end if;
 insert into public.event_story_entries(event_id,story_id,author_id,eligibility_status) values(p_event,p_story,p_user,'approved');
end $$;

-- Upgrade existing eligible pending submissions in active, unlocked competitions.
-- Rejected entries, closed events, and verified results remain untouched.
update public.event_story_entries en
set eligibility_status='approved',reviewed_at=now(),review_note='Automatically approved after eligibility checks'
from public.stories s, public.community_events e, auth.users u
where en.story_id=s.id and en.event_id=e.id and en.author_id=s.author_id
 and u.id=en.author_id and en.eligibility_status='pending'
 and s.status='published' and s.visibility='public' and s.moderation_status='approved'
 and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())
 and e.status in ('upcoming','live') and e.ends_at>now()
 and en.created_at>=e.entry_starts_at and en.created_at<e.entry_ends_at
 and (e.allow_existing_stories or s.created_at>=e.entry_starts_at)
 and not exists(select 1 from public.event_competition_results r where r.event_id=e.id);
commit;
