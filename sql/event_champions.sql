-- Champion publication is restricted to trusted server/admin workflows.
-- This migration deliberately inserts no universities, events, or winners.
create table if not exists public.community_events (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 160),
 status text not null default 'draft' check (status in ('draft','upcoming','live','completed','cancelled')),
 ends_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table if not exists public.event_universities (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 160),
 logo_url text not null check (logo_url ~ '^https://'),
 primary_color text not null check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
 secondary_color text not null check (secondary_color ~ '^#[0-9a-fA-F]{6}$')
);
create table if not exists public.event_champions (
 event_id uuid primary key references public.community_events(id) on delete cascade,
 university_id uuid not null references public.event_universities(id),
 winning_year integer not null check (winning_year between 2000 and 2200),
 verified_at timestamptz not null,
 verified_by uuid not null references auth.users(id),
 verification_note text not null check (char_length(verification_note) > 0)
);
create index if not exists community_events_latest_completed on public.community_events (ends_at desc, id) where status = 'completed';
alter table public.community_events enable row level security;
alter table public.event_universities enable row level security;
alter table public.event_champions enable row level security;
revoke all on public.community_events, public.event_universities, public.event_champions from anon, authenticated;
grant all on public.community_events, public.event_universities, public.event_champions to service_role;
