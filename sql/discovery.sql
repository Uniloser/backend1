-- Apply after schema.txt, genres.sql and comic_schema.sql. Additive; no analytics are deleted.
begin;
alter table public.stories add column if not exists published_at timestamptz;
alter table public.stories add column if not exists visibility text not null default 'public' check (visibility in ('public','private','unlisted'));
alter table public.stories add column if not exists moderation_status text not null default 'approved' check (moderation_status in ('approved','pending','hidden','banned'));
alter table public.stories add column if not exists is_mature boolean not null default false;
alter table public.stories add column if not exists is_complete boolean not null default false;
create table if not exists public.user_discovery_preferences (
 user_id uuid primary key references public.users(id) on delete cascade,
 preferences jsonb not null default '{"genres":[],"tags":[],"allowMature":false}'
);
alter table public.user_discovery_preferences enable row level security;
grant all on public.user_discovery_preferences to service_role;
alter table public.stories add column if not exists last_chapter_published_at timestamptz;
alter table public.stories add column if not exists chapters_published integer not null default 0;
update public.stories s set chapters_published=(select count(*) from public.chapters c where c.story_id=s.id and c.status='published'),
 last_chapter_published_at=(select max(coalesce(c.published_at,c.created_at)) from public.chapters c where c.story_id=s.id and c.status='published');
create or replace function public.discovery_chapter_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
 for target in select distinct x from unnest(array[case when tg_op<>'INSERT' then old.story_id end,case when tg_op<>'DELETE' then new.story_id end]) x where x is not null loop
  update public.stories s set chapters_published=(select count(*) from public.chapters where story_id=target and status='published'),
   last_chapter_published_at=(select max(coalesce(published_at,created_at)) from public.chapters where story_id=target and status='published') where s.id=target;
 end loop;
 return null;
end $$;
drop trigger if exists discovery_chapter_changed on public.chapters;
create trigger discovery_chapter_changed after insert or delete or update of status,published_at,story_id on public.chapters for each row execute function public.discovery_chapter_changed();
update public.stories s set published_at = coalesce((select min(published_at) from public.chapters c where c.story_id=s.id and c.status='published'), s.created_at)
where s.status='published' and s.published_at is null;
create or replace function public.discovery_publication_time() returns trigger language plpgsql as $$
begin
  if new.status='published' and new.published_at is null then new.published_at=now(); end if;
  return new;
end $$;
drop trigger if exists discovery_publication_time on public.stories;
create trigger discovery_publication_time before insert or update on public.stories for each row execute function public.discovery_publication_time();

-- Preserve old event values while adding discovery attribution and verified read signals.
alter table public.user_events drop constraint if exists user_events_event_type_check;
alter table public.user_events add constraint user_events_event_type_check check (event_type in
 ('view','like','follow','read_complete','abandon','search','discovery_shelf_view','story_impression','story_click','story_open','chapter_read','story_like','story_bookmark','story_follow','story_complete'));
-- These signals are written through authenticated server APIs, not arbitrary direct client inserts.
drop policy if exists "Users can insert their own events" on public.user_events;
create unique index if not exists idx_discovery_chapter_read_once on public.user_events(user_id, chapter_id)
 where event_type='chapter_read';
create unique index if not exists idx_discovery_story_complete_once on public.user_events(user_id,story_id) where event_type='story_complete';
create index if not exists idx_discovery_read_peers on public.user_events(story_id,created_at desc) where event_type='chapter_read';
create index if not exists idx_discovery_like_peers on public.likes(story_id,created_at desc);
create index if not exists idx_discovery_bookmark_peers on public.bookmarks(story_id,created_at desc);
create index if not exists idx_discovery_events_user_recent on public.user_events(user_id, created_at desc);
create index if not exists idx_discovery_events_story_reader on public.user_events(story_id, user_id, event_type, chapter_id);
create index if not exists idx_discovery_published_chapters on public.chapters(story_id, published_at desc) where status='published';
create index if not exists idx_discovery_likes_user_recent on public.likes(user_id, created_at desc);
create index if not exists idx_discovery_published_stories on public.stories(published_at desc, id) where status='published';
create index if not exists idx_discovery_recent_chapter on public.stories(last_chapter_published_at desc,id) where status='published';
create index if not exists idx_discovery_progress_recent on public.reading_progress(user_id,updated_at desc);

create table if not exists public.story_discovery_stats (
 story_id uuid primary key references public.stories(id) on delete cascade,
 metrics jsonb not null default '{}',
 trending_score double precision not null default 0,
 rising_score double precision not null default 0,
 hidden_gem_score double precision not null default 0,
 quality_score double precision not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.story_discovery_stats enable row level security;
create index if not exists idx_discovery_trending on public.story_discovery_stats(trending_score desc, story_id);
create index if not exists idx_discovery_rising on public.story_discovery_stats(rising_score desc, story_id);
create index if not exists idx_discovery_gems on public.story_discovery_stats(hidden_gem_score desc, story_id);
grant all on public.story_discovery_stats to service_role;

-- Live eligibility: bans, deletion, unpublishing and chapter removal take effect even with cached rankings.
-- This view and all RPCs below are exclusively available to the server service role.
create or replace view public.discovery_eligible as
select s.id, s.author_id, s.title, s.description, s.cover_url, s.genre, s.genre_id,
 coalesce(s.tags,'{}'::text[]) tags, s.status, s.created_at, s.updated_at, s.view_count, s.content_type,
 s.visibility, s.moderation_status, s.is_mature, s.is_complete, coalesce(s.published_at,s.created_at) published_at,
 s.last_chapter_published_at, s.chapters_published, true author_active,
 jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name,'avatar_url',u.avatar_url) author,
 coalesce(d.metrics,'{}'::jsonb) metrics,
 d.trending_score, d.rising_score, d.hidden_gem_score, d.quality_score
from public.stories s join public.users u on u.id=s.author_id join auth.users a on a.id=u.id
left join public.story_discovery_stats d on d.story_id=s.id
where s.status='published' and s.visibility='public' and s.moderation_status='approved'
 and s.chapters_published>0
 and (a.banned_until is null or a.banned_until<=now()) and a.deleted_at is null;
revoke all on public.discovery_eligible from public, anon, authenticated;
grant select on public.discovery_eligible to service_role;

-- Offline batch aggregation. Never called by a discovery request.
create or replace function public.discovery_metrics_batch(p_after uuid default null, p_limit int default 100)
returns table(story_id uuid, metrics jsonb) language sql stable security definer set search_path=public as $$
with batch as (select * from public.stories where (p_after is null or id>p_after) order by id limit least(greatest(p_limit,1),500))
select s.id, jsonb_build_object(
 'unique_readers',v.readers,'readers_7d',v.r7,'readers_previous_7d',v.previous7,
 'reads_lifetime',v.reads,'reads_24h',v.v1,'reads_7d',v.v7,'reads_30d',v.v30,
 'likes',l.total,'likes_7d',l.d7,'likes_30d',l.d30,
 'bookmarks',b.total,'bookmarks_7d',b.d7,'bookmarks_30d',b.d30,
 'comments',cm.total,'comments_7d',cm.d7,'comments_30d',cm.d30,
 'followers',f.total,'followers_7d',f.d7,'chapters_published',ch.total,
 'published_at',coalesce(s.published_at,s.created_at),'last_chapter_published_at',coalesce(ch.last_at,s.published_at,s.created_at),
 'last_activity_at',greatest(v.last_at,l.last_at,b.last_at,cm.last_at,ch.last_at,s.published_at,s.created_at),
 'completion_rate',coalesce(rd.completed::float/nullif(v.readers,0),0),
 'retention_rate',coalesce(rd.second_readers::float/nullif(rd.first_readers,0),0),
 'retention_3_rate',coalesce(rd.third_readers::float/nullif(rd.first_readers,0),0),
 'average_progress',coalesce(rd.progress*rd.readers/nullif(v.readers,0),0))
from batch s
cross join lateral (select count(distinct user_id) readers, count(distinct (user_id,chapter_id,date_trunc('day',created_at at time zone 'UTC'))) reads,
 count(distinct user_id) filter(where created_at>=now()-interval '7 days') r7,
 count(distinct user_id) filter(where created_at>=now()-interval '14 days' and created_at<now()-interval '7 days') previous7,
 count(distinct (user_id,chapter_id,date_trunc('day',created_at at time zone 'UTC'))) filter(where created_at>=now()-interval '1 day') v1,
 count(distinct (user_id,chapter_id,date_trunc('day',created_at at time zone 'UTC'))) filter(where created_at>=now()-interval '7 days') v7,
 count(distinct (user_id,chapter_id,date_trunc('day',created_at at time zone 'UTC'))) filter(where created_at>=now()-interval '30 days') v30,
 max(created_at) last_at from (
 select user_id,chapter_id,created_at from public.story_views where story_id=s.id
 union all select user_id,chapter_id,created_at from public.user_events where story_id=s.id and event_type='chapter_read'
 ) activity where user_id is not null and user_id<>s.author_id
 and exists(select 1 from auth.users a where a.id=activity.user_id and a.deleted_at is null and (a.banned_until is null or a.banned_until<=now()))) v
cross join lateral (select count(*) total,count(*) filter(where created_at>=now()-interval '7 days') d7,count(*) filter(where created_at>=now()-interval '30 days') d30,max(created_at) last_at from public.likes where story_id=s.id and user_id<>s.author_id) l
cross join lateral (select count(distinct user_id) total,count(distinct user_id) filter(where created_at>=now()-interval '7 days') d7,count(distinct user_id) filter(where created_at>=now()-interval '30 days') d30,max(created_at) last_at from public.bookmarks where story_id=s.id and user_id<>s.author_id) b
cross join lateral (select count(distinct cm.user_id) total,count(distinct cm.user_id) filter(where cm.created_at>=now()-interval '7 days') d7,count(distinct cm.user_id) filter(where cm.created_at>=now()-interval '30 days') d30,max(cm.created_at) last_at from public.comments cm join public.chapters c on c.id=cm.chapter_id where c.story_id=s.id and c.status='published' and cm.user_id<>s.author_id) cm
-- Author follows are the existing follow model; no invented story-follow table.
cross join lateral (select count(*) total,count(*) filter(where created_at>=now()-interval '7 days') d7 from public.follows where followed_id=s.author_id) f
cross join lateral (select count(*) total,max(coalesce(published_at,created_at)) last_at from public.chapters where story_id=s.id and status='published') ch
cross join lateral (
 select count(*) readers,count(*) filter(where n=ch.total and s.is_complete) completed,
 count(*) filter(where first_read) first_readers,count(*) filter(where first_read and second_read) second_readers,count(*) filter(where first_read and third_read) third_readers,
 avg(least(1.0,n::float/nullif(ch.total,0))) progress
 from (select e.user_id,count(distinct c.id) n,bool_or(c.position=1) first_read,bool_or(c.position=2) second_read,bool_or(c.position=3) third_read
 from public.user_events e join (select id,row_number() over(order by chapter_order,id) position from public.chapters where story_id=s.id and status='published') c on c.id=e.chapter_id
 where e.story_id=s.id and e.event_type='chapter_read' and e.user_id is not null and e.user_id<>s.author_id group by e.user_id) readers
) rd;
$$;

create or replace function public.discovery_user_signals(p_user uuid, p_limit int default 200)
returns table(story_id uuid, genre text, tags text[], author_id uuid, title text, opened boolean, chapters_read bigint, liked boolean, bookmarked boolean, completed boolean, started boolean, abandoned boolean, occurred_at timestamptz)
language sql stable security definer set search_path=public as $$
with raw as (
 (select story_id,'like' kind,null::uuid chapter_id,created_at t from public.likes where user_id=p_user order by created_at desc limit least(p_limit,200)) union all
 (select story_id,'bookmark',null::uuid,updated_at from public.bookmarks where user_id=p_user order by updated_at desc limit least(p_limit,200)) union all
 (select story_id,'progress',last_chapter_id,updated_at from public.reading_progress where user_id=p_user order by updated_at desc limit least(p_limit,200)) union all
 (select story_id,event_type,chapter_id,created_at from public.user_events where user_id=p_user and event_type in ('chapter_read','story_complete','abandon') order by created_at desc limit 1000) union all
 (select story_id,'view',chapter_id,created_at from public.story_views where user_id=p_user order by created_at desc limit least(p_limit,200))
), grouped as (select r.story_id,bool_or(kind='view') opened,count(distinct chapter_id) filter(where kind='chapter_read') chapters_read,
 bool_or(kind='like') liked,bool_or(kind='bookmark') bookmarked,bool_or(kind='story_complete') completed,
 bool_or(kind in ('progress','chapter_read')) started,bool_or(kind='abandon') abandoned,max(t) occurred_at from raw r group by r.story_id)
select g.story_id,s.genre,s.tags,s.author_id,s.title,g.opened,g.chapters_read,g.liked,g.bookmarked,g.completed,g.started,g.abandoned,g.occurred_at
from grouped g join public.discovery_eligible s on s.id=g.story_id where s.author_id<>p_user order by g.occurred_at desc limit least(p_limit,200);
$$;

drop function if exists public.discovery_collaborative(uuid[],uuid,int,int);
create or replace function public.discovery_collaborative(p_seeds uuid[], p_user uuid default null, p_limit int default 100, p_peers int default 100,p_weights jsonb default '{}')
returns table(story_id uuid, score double precision) language sql stable security definer set search_path=public as $$
with peers as (
 select user_id from (
  (select l.user_id from public.likes l join public.stories s on s.id=l.story_id where l.story_id=any(p_seeds) and l.user_id<>s.author_id and l.user_id is distinct from p_user order by l.created_at desc limit 200) union all
  (select b.user_id from public.bookmarks b join public.stories s on s.id=b.story_id where b.story_id=any(p_seeds) and b.user_id<>s.author_id and b.user_id is distinct from p_user order by b.created_at desc limit 200) union all
  (select e.user_id from (select e.user_id,e.story_id,e.chapter_id from public.user_events e join public.stories s on s.id=e.story_id where e.story_id=any(p_seeds) and e.event_type='chapter_read' and e.user_id<>s.author_id and e.user_id is distinct from p_user order by e.created_at desc limit 1000) e group by e.user_id,e.story_id having count(distinct e.chapter_id)>=2 limit 200)
 ) x where user_id is not null and exists(select 1 from auth.users a where a.id=x.user_id and a.deleted_at is null and (a.banned_until is null or a.banned_until<=now())) group by user_id order by count(*) desc,user_id limit least(p_peers,100)
), votes as (
 select p.user_id,a.story_id,max(a.weight) weight from peers p cross join lateral (
  (select story_id,coalesce((p_weights->>'like')::float,1) weight from public.likes where user_id=p.user_id order by created_at desc limit 50) union all
  (select story_id,coalesce((p_weights->>'bookmark')::float,1) from public.bookmarks where user_id=p.user_id order by updated_at desc limit 50) union all
  (select story_id,coalesce((p_weights->>'multiple')::float,1) from (select story_id,chapter_id from public.user_events where user_id=p.user_id and event_type='chapter_read' order by created_at desc limit 200) e group by story_id having count(distinct chapter_id)>=2)
 ) a where not(a.story_id=any(p_seeds)) group by p.user_id,a.story_id
)
select v.story_id,sum(v.weight)::float score from votes v join public.discovery_eligible s on s.id=v.story_id
where v.user_id<>s.author_id group by v.story_id order by score desc,v.story_id limit least(p_limit,100);
$$;

-- Idempotent, validated completion signals; a chapter open alone is never a completed read.
create or replace function public.discovery_record_chapter(p_user uuid,p_story uuid,p_chapter uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.discovery_eligible s join public.chapters c on c.story_id=s.id where s.id=p_story and c.id=p_chapter and c.status='published' and s.author_id<>p_user) then return; end if;
 insert into public.user_events(user_id,story_id,chapter_id,event_type) values(p_user,p_story,p_chapter,'chapter_read') on conflict do nothing;
 if exists(select 1 from public.stories where id=p_story and is_complete) and not exists(
  select 1 from public.chapters c where c.story_id=p_story and c.status='published' and not exists(select 1 from public.user_events e where e.user_id=p_user and e.chapter_id=c.id and e.event_type='chapter_read'))
 and not exists(select 1 from public.user_events where user_id=p_user and story_id=p_story and event_type='story_complete') then
  insert into public.user_events(user_id,story_id,event_type) values(p_user,p_story,'story_complete') on conflict do nothing;
 end if;
end $$;

create or replace function public.discovery_exclusions(p_user uuid) returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('blocked',coalesce((select jsonb_agg(id) from (
 select blocked_id id from public.user_blocks where blocker_id=p_user union select blocker_id from public.user_blocks where blocked_id=p_user) b),'[]'::jsonb),
 'hidden',coalesce((select jsonb_agg(distinct coalesce(r.story_id,c.story_id)) from public.reports r left join public.chapters c on c.id=r.chapter_id where reporter_id=p_user and r.status<>'dismissed' and coalesce(r.story_id,c.story_id) is not null),'[]'::jsonb),
 'consumed',coalesce((select jsonb_agg(story_id) from (
 select story_id from public.reading_progress where user_id=p_user and last_chapter_id is not null
 union select story_id from public.user_events where user_id=p_user and story_id is not null and event_type in ('chapter_read','story_complete')) consumed),'[]'::jsonb));
$$;
-- Central authorization for direct story/chapter reads, including newly added visibility controls.
create or replace function public.discovery_can_read_story(p_story uuid,p_user uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.stories s join auth.users a on a.id=s.author_id where s.id=p_story and (
 s.author_id=p_user or (s.status='published' and s.visibility in ('public','unlisted') and s.moderation_status='approved'
 and a.deleted_at is null and (a.banned_until is null or a.banned_until<=now())
 and (not s.is_mature or exists(select 1 from public.user_discovery_preferences p where p.user_id=p_user and p.preferences->>'allowMature'='true'))
 and not exists(select 1 from public.user_blocks b where (b.blocker_id=p_user and b.blocked_id=s.author_id) or (b.blocker_id=s.author_id and b.blocked_id=p_user))
 )));
$$;
-- RLS wrapper binds the identity to auth.uid(); clients cannot inspect another user's permissions.
create or replace function public.can_read_story(p_story uuid) returns boolean language sql stable security definer set search_path=public as $$
select public.discovery_can_read_story(p_story,auth.uid());
$$;
drop policy if exists "Published stories are viewable by everyone" on public.stories;
create policy "Published stories are viewable by everyone" on public.stories for select using (public.can_read_story(id));
drop policy if exists "Published chapters are viewable by everyone" on public.chapters;
create policy "Published chapters are viewable by everyone" on public.chapters for select using (
 public.can_read_story(story_id) and (status='published' or exists(select 1 from public.stories s where s.id=story_id and s.author_id=auth.uid())));
-- Moderation and derived publication counters cannot be changed through direct client writes.
create or replace function public.discovery_protect_metadata() returns trigger language plpgsql as $$
begin
 if current_user in ('anon','authenticated') then
  if tg_op='INSERT' then
   new.moderation_status='approved'; new.chapters_published=0; new.last_chapter_published_at=null; new.published_at=null;
  elsif new.moderation_status is distinct from old.moderation_status or new.chapters_published is distinct from old.chapters_published or new.last_chapter_published_at is distinct from old.last_chapter_published_at or new.published_at is distinct from old.published_at then
   raise exception 'Discovery moderation and counters are server-managed';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists discovery_protect_metadata on public.stories;
create trigger discovery_protect_metadata before insert or update on public.stories for each row execute function public.discovery_protect_metadata();
revoke all on function public.discovery_can_read_story(uuid,uuid) from public,anon,authenticated;
grant execute on function public.discovery_can_read_story(uuid,uuid) to service_role;
grant execute on function public.can_read_story(uuid) to anon,authenticated,service_role;
revoke all on function public.discovery_metrics_batch(uuid,int),public.discovery_user_signals(uuid,int),public.discovery_collaborative(uuid[],uuid,int,int,jsonb),public.discovery_record_chapter(uuid,uuid,uuid),public.discovery_exclusions(uuid) from public,anon,authenticated;
grant execute on function public.discovery_metrics_batch(uuid,int),public.discovery_user_signals(uuid,int),public.discovery_collaborative(uuid[],uuid,int,int,jsonb),public.discovery_record_chapter(uuid,uuid,uuid),public.discovery_exclusions(uuid) to service_role;
commit;
