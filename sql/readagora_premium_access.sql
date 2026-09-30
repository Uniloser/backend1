-- ReadAgora+ access model. Additive migration; do not remove existing content.
begin;

alter table public.stories
  add column if not exists access_type text not null default 'FREE'
    check (access_type in ('FREE', 'PREMIUM')),
  add column if not exists free_chapter_count integer not null default 3
    check (free_chapter_count >= 3),
  add column if not exists monetization_enabled boolean not null default false;

create table if not exists public.creator_monetization_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null default 'NOT_ELIGIBLE'
    check (status in ('NOT_ELIGIBLE', 'PENDING', 'ELIGIBLE', 'APPROVED', 'SUSPENDED')),
  approved_at timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  provider_subscription_id text,
  plan text not null check (plan = 'READAGORA_PLUS_WEEKLY'),
  status text not null check (status in ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'GRACE_PERIOD')),
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create index if not exists subscriptions_user_active_period_idx
  on public.subscriptions (user_id, status, current_period_end desc);

alter table public.creator_monetization_profiles enable row level security;
alter table public.subscriptions enable row level security;

-- Entitlements and eligibility are written only by trusted backend service-role code.
revoke all on public.creator_monetization_profiles from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
grant all on public.creator_monetization_profiles to service_role;
grant all on public.subscriptions to service_role;

commit;
