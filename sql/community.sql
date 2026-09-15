-- Apply in Supabase SQL Editor before deploying the Community API.
begin;
create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 content text not null check (length(trim(content)) between 1 and 4000),
 post_type text not null default 'post' check (post_type in ('post','chapter','announcement','poll','discussion')),
 story_id uuid references public.stories(id) on delete cascade,
 chapter_id uuid references public.chapters(id) on delete cascade,
 contains_spoiler boolean not null default false,
 image_url text,
 poll_options text[],
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (chapter_id is null or story_id is not null),
 check ((post_type = 'poll' and poll_options is not null and cardinality(poll_options) between 2 and 4) or (post_type <> 'poll' and poll_options is null))
);
create index if not exists community_posts_recent on public.community_posts(created_at desc,id desc);
create index if not exists community_posts_user on public.community_posts(user_id,created_at desc);
create index if not exists community_posts_type on public.community_posts(post_type,created_at desc);
create index if not exists community_posts_story on public.community_posts(story_id);
create table if not exists public.community_post_likes (
 post_id uuid references public.community_posts(id) on delete cascade,
 user_id uuid references public.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create table if not exists public.community_post_saves (
 post_id uuid references public.community_posts(id) on delete cascade,
 user_id uuid references public.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(post_id,user_id)
);
create index if not exists community_saves_user on public.community_post_saves(user_id);
create table if not exists public.community_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references public.users(id) on delete cascade,
 parent_comment_id uuid references public.community_comments(id) on delete cascade,
 content text not null check (length(trim(content)) between 1 and 2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists community_comments_post on public.community_comments(post_id,created_at,id);
create index if not exists community_comments_parent on public.community_comments(parent_comment_id);
create table if not exists public.community_poll_votes (
 post_id uuid references public.community_posts(id) on delete cascade,
 user_id uuid references public.users(id) on delete cascade,
 option_index integer not null check(option_index between 0 and 3),
 primary key(post_id,user_id)
);
create index if not exists community_likes_user on public.community_post_likes(user_id);
create index if not exists community_comments_user on public.community_comments(user_id);
create index if not exists community_votes_user on public.community_poll_votes(user_id);
-- Community access goes through the authenticated/validated backend, not direct client SQL.
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_post_saves enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_poll_votes enable row level security;
revoke all on public.community_posts,public.community_post_likes,public.community_post_saves,public.community_comments,public.community_poll_votes from anon,authenticated;
grant all on public.community_posts,public.community_post_likes,public.community_post_saves,public.community_comments,public.community_poll_votes to service_role;
-- Aggregate counts server-side; never transfer lists of voters/likers to readers.
create or replace function public.community_stats(post_ids uuid[], viewer uuid)
returns table(id uuid, like_count bigint, comment_count bigint, liked boolean, saved boolean, my_vote integer, poll_counts jsonb, is_author boolean, latest_activity timestamptz)
language sql stable set search_path = public as $$
 select p.id,
 (select count(*) from community_post_likes l where l.post_id=p.id),
 (select count(*) from community_comments c where c.post_id=p.id),
 exists(select 1 from community_post_likes l where l.post_id=p.id and l.user_id=viewer),
 exists(select 1 from community_post_saves s where s.post_id=p.id and s.user_id=viewer),
 (select v.option_index from community_poll_votes v where v.post_id=p.id and v.user_id=viewer),
 case when p.poll_options is null then null else (select jsonb_agg((select count(*) from community_poll_votes v where v.post_id=p.id and v.option_index=i) order by i) from generate_series(0,cardinality(p.poll_options)-1) i) end,
 exists(select 1 from stories s where s.author_id=p.user_id and s.status='published'),
 coalesce((select max(c.created_at) from community_comments c where c.post_id=p.id),p.created_at)
 from community_posts p where p.id=any(post_ids);
$$;
revoke all on function public.community_stats(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.community_stats(uuid[],uuid) to service_role;
commit;
