-- Founding Alpha membership flag.
-- Run once in the Supabase SQL editor after the base users table exists.

alter table public.users
  add column if not exists is_alpha boolean not null default false;

-- Everyone already on the platform is part of the founding Alpha cohort.
update public.users
set is_alpha = true
where is_alpha = false;
