-- Durable storage for manuscript import state and private parsed results.
-- Apply in the Supabase SQL Editor before enabling manuscript imports.
create table if not exists public.manuscript_imports (
	id uuid primary key,
	story_id uuid not null references public.stories(id) on delete cascade,
	user_id uuid not null references public.users(id) on delete cascade,
	original_filename text not null,
	storage_path text,
	file_type text not null check (file_type in ('pdf', 'docx')),
	file_size bigint not null check (file_size >= 0),
	status text not null check (status in ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
	error_message text,
	result jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists manuscript_imports_user_created_idx
	on public.manuscript_imports (user_id, created_at desc);

alter table public.manuscript_imports enable row level security;
revoke all on table public.manuscript_imports from anon, authenticated;
grant all privileges on table public.manuscript_imports to service_role;

insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', false)
on conflict (id) do update set public = false;
