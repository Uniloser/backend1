-- Chapter likes and quoted comment passages.
-- Run in the Supabase SQL editor after the base schema.

create table if not exists public.chapter_likes (
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create index if not exists idx_chapter_likes_chapter on public.chapter_likes(chapter_id);

alter table public.chapter_likes enable row level security;
grant all on public.chapter_likes to service_role;

alter table public.comments
  add column if not exists quoted_text text;
