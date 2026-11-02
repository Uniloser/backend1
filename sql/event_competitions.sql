-- Extend existing event data; apply after event_story_voting.sql.
begin;
alter table public.community_events
 add column if not exists slug text,
 add column if not exists prize_amount numeric(12,2) not null default 500 check(prize_amount>=0),
 add column if not exists prize_currency text not null default 'ZMW' check(prize_currency ~ '^[A-Z]{3}$'),
 add column if not exists entry_starts_at timestamptz,
 add column if not exists entry_ends_at timestamptz,
 add column if not exists entries_enabled boolean not null default true,
 add column if not exists voting_enabled boolean not null default true,
 add column if not exists allow_existing_stories boolean not null default true,
 add column if not exists allow_vote_changes boolean not null default false,
 add column if not exists show_rankings boolean not null default true,
 add column if not exists show_vote_totals boolean not null default true,
 add column if not exists banner_url text,
 add column if not exists cover_url text;
update public.community_events set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g')) || '-' || left(id::text,8) where slug is null;
alter table public.community_events alter column slug set not null;
create unique index if not exists community_events_slug on public.community_events(slug);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='competition_schedule' and conrelid='public.community_events'::regclass) then
  alter table public.community_events add constraint competition_schedule check(
   ((entry_starts_at is null and entry_ends_at is null) or (entry_starts_at is not null and entry_ends_at is not null and starts_at is not null and entry_starts_at>=starts_at and entry_ends_at>entry_starts_at and entry_ends_at<=ends_at))
   and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
 end if;
end $$;
alter table public.event_story_entries
 add column if not exists author_id uuid references public.users(id),
 add column if not exists eligibility_status text not null default 'approved' check(eligibility_status in ('pending','approved','rejected')),
 add column if not exists review_note text,
 add column if not exists reviewed_by uuid references auth.users(id),
 add column if not exists reviewed_at timestamptz;
update public.event_story_entries en set author_id=s.author_id from public.stories s where s.id=en.story_id and en.author_id is null;
-- Preserve legacy entries if an author entered several stories; new submissions
-- serialize on the event row and enforce one entry per author going forward.
create index if not exists event_entries_author on public.event_story_entries(event_id,author_id);
alter table public.event_story_votes
 add column if not exists created_at timestamptz not null default now(),
 add column if not exists validity text not null default 'valid' check(validity in ('valid','invalid')),
 add column if not exists audit_reason text,
 add column if not exists reviewed_by uuid references auth.users(id),
 add column if not exists reviewed_at timestamptz;
create table if not exists public.event_competition_results (
 event_id uuid primary key references public.community_events(id),
 story_id uuid not null references public.stories(id),
 verified_votes bigint not null check(verified_votes>=0),
 rankings jsonb not null,
 verified_by uuid not null references auth.users(id),
 verified_at timestamptz not null default now(),
 verification_note text not null check(length(trim(verification_note))>0),
 published_at timestamptz
);
create table if not exists public.event_competition_audit (
 id bigint generated always as identity primary key,
 event_id uuid not null references public.community_events(id),
 actor_id uuid not null references auth.users(id),
 action text not null, reason text not null check(length(trim(reason))>0),
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.event_competition_results enable row level security;
alter table public.event_competition_audit enable row level security;
revoke all on public.event_competition_results,public.event_competition_audit from anon,authenticated;
grant all on public.event_competition_results,public.event_competition_audit to service_role;
grant usage,select on sequence public.event_competition_audit_id_seq to service_role;
create or replace function public.require_event_admin(p_actor uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='admin' and deleted_at is null and (banned_until is null or banned_until<now())) then
  raise exception 'An active administrator is required';
 end if;
end $$;
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
 insert into public.event_story_entries(event_id,story_id,author_id,eligibility_status) values(p_event,p_story,p_user,'pending');
end $$;
create or replace function public.cast_event_story_vote(p_event uuid,p_story uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.community_events; prior public.event_story_votes; t timestamptz;
begin
 select * into e from public.community_events where id=p_event for update;
 t=clock_timestamp();
 if not found or e.status not in ('upcoming','live') or not e.voting_enabled or e.starts_at is null or e.starts_at>t or e.ends_at<=t or e.voting_starts_at is null or e.voting_ends_at is null or e.voting_starts_at>t or e.voting_ends_at<=t then raise exception 'Voting is not open for this event'; end if;
 if exists(select 1 from public.event_competition_results where event_id=p_event) then raise exception 'Results are under verification'; end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<t)) then raise exception 'Confirm your email before voting'; end if;
 perform 1 from public.event_story_entries en join public.stories s on s.id=en.story_id
 where en.event_id=p_event and en.story_id=p_story and en.eligibility_status='approved' and s.author_id<>p_user and s.status='published' and s.visibility='public' and s.moderation_status='approved' for share of en,s;
 if not found then raise exception 'This story is not eligible for your vote (self-voting is not allowed)'; end if;
 select * into prior from public.event_story_votes where event_id=p_event and user_id=p_user;
 if found then
  if prior.validity<>'valid' then raise exception 'Your vote is under review'; end if;
  if prior.story_id=p_story then return; end if;
  if not e.allow_vote_changes then raise exception 'Your vote is final for this event'; end if;
 end if;
 insert into public.event_story_votes(event_id,story_id,user_id,created_at,updated_at) values(p_event,p_story,p_user,t,t)
 on conflict(event_id,user_id) do update set story_id=excluded.story_id,updated_at=t;
end $$;
create or replace function public.event_story_vote_counts(p_event uuid)
returns table(story_id uuid,votes bigint) language sql stable security definer set search_path=public as $$
 select v.story_id,count(*) from public.event_story_votes v join auth.users u on u.id=v.user_id
 join public.stories s on s.id=v.story_id
 where v.event_id=p_event and v.validity='valid' and u.email_confirmed_at is not null
 and u.deleted_at is null and (u.banned_until is null or u.banned_until<now()) and s.author_id<>v.user_id group by v.story_id;
$$;
create or replace function public.review_event_competition(p_event uuid,p_actor uuid,p_action text,p_story uuid default null,p_reader uuid default null,p_reason text default '')
returns void language plpgsql security definer set search_path=public as $$
declare e public.community_events; snapshot jsonb; top_votes bigint; chosen_votes bigint; tied integer;
begin
 perform public.require_event_admin(p_actor);
 if length(trim(p_reason))<3 then raise exception 'Provide an audit reason'; end if;
 select * into e from public.community_events where id=p_event for update;
 if not found then raise exception 'Event not found'; end if;
 if exists(select 1 from public.event_competition_results where event_id=p_event and published_at is not null) then raise exception 'Published results are locked'; end if;
 if p_action in ('approve_entry','reject_entry') then
  update public.event_story_entries set eligibility_status=case when p_action='approve_entry' then 'approved' else 'rejected' end,reviewed_by=p_actor,reviewed_at=now(),review_note=p_reason where event_id=p_event and story_id=p_story;
  if not found then raise exception 'Entry not found'; end if;
 elsif p_action in ('invalidate_vote','restore_vote') then
  update public.event_story_votes set validity=case when p_action='invalidate_vote' then 'invalid' else 'valid' end,reviewed_by=p_actor,reviewed_at=now(),audit_reason=p_reason where event_id=p_event and user_id=p_reader;
  if not found then raise exception 'Vote not found'; end if;
 elsif p_action='close_voting' then
  update public.community_events set voting_enabled=false where id=p_event;
 elsif p_action in ('verify','verify_override') then
  if e.voting_enabled and e.voting_ends_at>now() then raise exception 'Close voting before verifying results'; end if;
  if e.status in ('draft','cancelled') or e.voting_starts_at is null or e.voting_starts_at>now() then raise exception 'This event has not held voting'; end if;
  select jsonb_agg(jsonb_build_object('story_id',s.id,'title',s.title,'author_id',s.author_id,'cover_url',s.cover_url,'votes',coalesce(c.votes,0)) order by coalesce(c.votes,0) desc,s.id) into snapshot
  from public.event_story_entries en join public.stories s on s.id=en.story_id left join public.event_story_vote_counts(p_event) c on c.story_id=s.id
  where en.event_id=p_event and en.eligibility_status='approved' and s.status='published' and s.visibility='public' and s.moderation_status='approved';
  if snapshot is null then raise exception 'No eligible entries to verify'; end if;
  top_votes=(snapshot->0->>'votes')::bigint;
  select count(*) into tied from jsonb_array_elements(snapshot) item where (item->>'votes')::bigint=top_votes;
  if p_action='verify' and tied>1 then raise exception 'Tied results require a documented tie-break override'; end if;
  if p_story is null then p_story=(snapshot->0->>'story_id')::uuid; end if;
  select (item->>'votes')::bigint into chosen_votes from jsonb_array_elements(snapshot) item where item->>'story_id'=p_story::text;
  if chosen_votes is null then raise exception 'Winner must be an eligible entry'; end if;
  if p_action='verify' and chosen_votes<>top_votes then raise exception 'Winner must have the highest verified vote count'; end if;
  update public.community_events set voting_enabled=false,entries_enabled=false where id=p_event;
  insert into public.event_competition_results(event_id,story_id,verified_votes,rankings,verified_by,verification_note) values(p_event,p_story,chosen_votes,snapshot,p_actor,p_reason)
  on conflict(event_id) do update set story_id=excluded.story_id,verified_votes=excluded.verified_votes,rankings=excluded.rankings,verified_by=p_actor,verified_at=now(),verification_note=p_reason;
 elsif p_action='publish' then
  update public.event_competition_results set published_at=now() where event_id=p_event and published_at is null;
  if not found then raise exception 'Verify the results before publishing'; end if;
  update public.community_events set status='completed',entries_enabled=false,voting_enabled=false where id=p_event;
 else raise exception 'Unknown review action'; end if;
 if p_action in ('approve_entry','reject_entry','invalidate_vote','restore_vote') then delete from public.event_competition_results where event_id=p_event; end if;
 insert into public.event_competition_audit(event_id,actor_id,action,reason,details) values(p_event,p_actor,p_action,p_reason,jsonb_build_object('storyId',p_story,'readerId',p_reader));
end $$;
revoke all on function public.require_event_admin(uuid),public.submit_event_story(uuid,uuid,uuid),public.review_event_competition(uuid,uuid,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.require_event_admin(uuid),public.submit_event_story(uuid,uuid,uuid),public.review_event_competition(uuid,uuid,text,uuid,uuid,text) to service_role;
create or replace function public.admin_add_event_story(p_event uuid,p_story uuid,p_actor uuid)
returns void language plpgsql security definer set search_path=public as $$
declare s public.stories;
begin
 perform public.require_event_admin(p_actor);
 perform 1 from public.community_events where id=p_event for update;
 if not found then raise exception 'Event not found'; end if;
 if exists(select 1 from public.event_competition_results where event_id=p_event) then raise exception 'Entries are locked during result verification'; end if;
 select * into s from public.stories where id=p_story for share;
 if not found or s.status<>'published' or s.visibility<>'public' or s.moderation_status<>'approved' then raise exception 'Choose an approved, public, published story'; end if;
 if exists(select 1 from public.event_story_entries where event_id=p_event and author_id=s.author_id and story_id<>p_story) then raise exception 'This author already has an entry'; end if;
 insert into public.event_story_entries(event_id,story_id,author_id,eligibility_status,reviewed_by,reviewed_at,review_note) values(p_event,p_story,s.author_id,'approved',p_actor,now(),'Admin entered eligible story') on conflict(event_id,story_id) do nothing;
 insert into public.event_competition_audit(event_id,actor_id,action,reason,details) values(p_event,p_actor,'add_entry','Admin entered eligible story',jsonb_build_object('storyId',p_story));
end $$;
revoke all on function public.admin_add_event_story(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_add_event_story(uuid,uuid,uuid) to service_role;
-- A verified result must not be silently changed by schedule/configuration edits.
create or replace function public.guard_verified_competition() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from public.event_competition_results where event_id=old.id) and
 (new.prize_amount is distinct from old.prize_amount or new.prize_currency is distinct from old.prize_currency or (new.status is distinct from old.status and not(new.status='completed' and exists(select 1 from public.event_competition_results where event_id=old.id and published_at is not null))) or new.slug is distinct from old.slug or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.entry_starts_at is distinct from old.entry_starts_at or new.entry_ends_at is distinct from old.entry_ends_at or new.voting_starts_at is distinct from old.voting_starts_at or new.voting_ends_at is distinct from old.voting_ends_at or new.voting_enabled or new.entries_enabled) then raise exception 'Verified results lock competition dates and entry/vote controls'; end if;
 return new;
end $$;
drop trigger if exists guard_verified_competition on public.community_events;
create trigger guard_verified_competition before update on public.community_events for each row execute function public.guard_verified_competition();
-- Scalar JSON avoids the PostgREST row cap while the API paginates the DTO.
create or replace function public.event_competition_entries(p_event uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('story_id',s.id,'created_at',en.created_at,'story',jsonb_build_object('id',s.id,'title',s.title,'description',s.description,'author_id',s.author_id,'cover_url',s.cover_url,'genre',s.genre,'author',jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name)),'votes',coalesce(c.votes,0)) order by en.created_at,s.id),'[]'::jsonb)
 from public.event_story_entries en join public.stories s on s.id=en.story_id join public.users u on u.id=s.author_id
 left join public.event_story_vote_counts(p_event) c on c.story_id=s.id
 where en.event_id=p_event and en.eligibility_status='approved' and s.status='published' and s.visibility='public' and s.moderation_status='approved';
$$;
revoke all on function public.event_competition_entries(uuid) from public,anon,authenticated;
grant execute on function public.event_competition_entries(uuid) to service_role;
commit;
