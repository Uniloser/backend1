-- Apply after event_champions.sql and community_events_admin.sql.
create table if not exists public.event_story_entries (
 event_id uuid not null references public.community_events(id) on delete cascade,
 story_id uuid not null references public.stories(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(event_id,story_id)
);
create table if not exists public.event_story_votes (
 event_id uuid not null, story_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 updated_at timestamptz not null default now(),
 primary key(event_id,user_id),
 foreign key(event_id,story_id) references public.event_story_entries(event_id,story_id) on delete cascade
);
create index if not exists event_story_votes_counts on public.event_story_votes(event_id,story_id);
alter table public.event_story_entries enable row level security;
alter table public.event_story_votes enable row level security;
revoke all on public.event_story_entries,public.event_story_votes from anon,authenticated;
grant all on public.event_story_entries,public.event_story_votes to service_role;
create or replace function public.cast_event_story_vote(p_event uuid,p_story uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public as $$
declare e public.community_events;
begin
 select * into e from public.community_events where id=p_event for share;
 if not found or e.status not in ('upcoming','live') or e.starts_at>now() or e.ends_at<=now()
 or e.voting_starts_at is null or e.voting_ends_at is null or e.voting_starts_at>now() or e.voting_ends_at<=now() then
  raise exception 'Voting is not open for this event';
 end if;
 perform 1 from public.event_story_entries en join public.stories s on s.id=en.story_id
 where en.event_id=p_event and en.story_id=p_story and s.status='published'
 and s.visibility='public' and s.moderation_status='approved' for share of en,s;
 if not found then raise exception 'This story is not eligible for this event'; end if;
 insert into public.event_story_votes(event_id,story_id,user_id) values(p_event,p_story,p_user)
 on conflict(event_id,user_id) do update set story_id=excluded.story_id,updated_at=now();
end $$;
create or replace function public.event_story_vote_counts(p_event uuid)
returns table(story_id uuid,votes bigint) language sql stable security definer set search_path=public as $$
 select story_id,count(*) from public.event_story_votes where event_id=p_event group by story_id;
$$;
revoke all on function public.cast_event_story_vote(uuid,uuid,uuid),public.event_story_vote_counts(uuid) from public,anon,authenticated;
grant execute on function public.cast_event_story_vote(uuid,uuid,uuid),public.event_story_vote_counts(uuid) to service_role;
