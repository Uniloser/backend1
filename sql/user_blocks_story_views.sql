-- Run in Supabase SQL Editor if user_blocks / story_views are missing
-- (Project → SQL → New query).

-- ============================================================
-- USER BLOCKS
-- ============================================================
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- ============================================================
-- STORY VIEWS
-- ============================================================
create table if not exists public.story_views (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  session_id text,
  chapter_id uuid references public.chapters(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_story_views_story on public.story_views(story_id, created_at desc);
create index if not exists idx_story_views_user on public.story_views(user_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_blocks enable row level security;
alter table public.story_views enable row level security;

drop policy if exists "Users can view their own blocks" on public.user_blocks;
create policy "Users can view their own blocks"
  on public.user_blocks for select using (blocker_id = auth.uid());

drop policy if exists "Users can create their own blocks" on public.user_blocks;
create policy "Users can create their own blocks"
  on public.user_blocks for insert with check (blocker_id = auth.uid());

drop policy if exists "Users can delete their own blocks" on public.user_blocks;
create policy "Users can delete their own blocks"
  on public.user_blocks for delete using (blocker_id = auth.uid());

drop policy if exists "Users can record story views" on public.story_views;
create policy "Users can record story views"
  on public.story_views for insert with check (user_id is null or user_id = auth.uid());
