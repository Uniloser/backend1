-- Run in the Supabase SQL editor before deploying chapter comment replies.
begin;

alter table public.comments
  add column if not exists parent_comment_id uuid
    references public.comments(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_comments_chapter_parent_created
  on public.comments(chapter_id, parent_comment_id, created_at desc, id desc);

commit;
