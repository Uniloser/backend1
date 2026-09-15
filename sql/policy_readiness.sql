-- Apply to the deployment database before releasing the reporting UI.
-- Does not delete accounts or change existing report data.
alter table public.reports add column if not exists story_id uuid references public.stories(id) on delete set null;
alter table public.reports add column if not exists chapter_id uuid references public.chapters(id) on delete set null;
alter table public.reports add column if not exists comment_id uuid references public.comments(id) on delete set null;
alter table public.reports add column if not exists reported_user_id uuid references public.users(id) on delete set null;
alter table public.reports add column if not exists resolution_note text;
alter table public.reports add column if not exists assigned_to uuid references public.users(id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;

-- Inspect live deletion rules; compare with src/schema/schema.txt.
-- public.users -> auth.users and owned data -> users/stories/chapters must cascade.
select conrelid::regclass as source_table, confrelid::regclass as target_table,
       conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f' and confrelid in ('auth.users'::regclass, 'public.users'::regclass,
                                    'public.stories'::regclass, 'public.chapters'::regclass);
