-- ReadAgora wallet and progression system
-- Run after the base schema has been applied.

create table public.gem_wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gem_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount bigint not null check (amount <> 0),
  reason text not null,
  reference_id text,
  idempotency_key text unique,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_gem_transactions_user_created
  on public.gem_transactions(user_id, created_at desc);

create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  title text not null,
  description text not null,
  icon text,
  gem_prize bigint not null default 0 check (gem_prize >= 0),
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  goal_type text not null,
  goal_amount integer not null check (goal_amount > 0),
  gem_prize bigint not null default 0 check (gem_prize >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

create table public.user_challenge_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  primary key (user_id, challenge_id)
);

create or replace function public.apply_gem_transaction(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_reference_id text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'
)
returns public.gem_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.gem_wallets;
begin
  if p_amount = 0 then
    raise exception 'Gem amount cannot be zero';
  end if;

  insert into public.gem_wallets(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if p_idempotency_key is not null and exists (
    select 1 from public.gem_transactions
    where idempotency_key = p_idempotency_key
  ) then
    select * into result from public.gem_wallets where user_id = p_user_id;
    return result;
  end if;

  update public.gem_wallets
  set balance = balance + p_amount,
      updated_at = now()
  where user_id = p_user_id
    and balance + p_amount >= 0
  returning * into result;

  if result.user_id is null then
    raise exception 'Insufficient Gems';
  end if;

  insert into public.gem_transactions
    (user_id, amount, reason, reference_id, idempotency_key, metadata)
  values
    (p_user_id, p_amount, p_reason, p_reference_id, p_idempotency_key, p_metadata);

  return result;
end;
$$;

revoke all on function public.apply_gem_transaction(uuid, bigint, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.apply_gem_transaction(uuid, bigint, text, text, text, jsonb) to service_role;

alter table public.gem_wallets enable row level security;
alter table public.gem_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenge_progress enable row level security;

create policy "Users can view their wallet"
  on public.gem_wallets for select using (auth.uid() = user_id);
create policy "Users can view their transactions"
  on public.gem_transactions for select using (auth.uid() = user_id);
create policy "Achievements are public"
  on public.achievements for select using (true);
create policy "Users can view their achievements"
  on public.user_achievements for select using (auth.uid() = user_id);
create policy "Active challenges are public"
  on public.challenges for select using (now() between starts_at and ends_at);
create policy "Users can view their challenge progress"
  on public.user_challenge_progress for select using (auth.uid() = user_id);

insert into public.achievements (code, title, description, icon, gem_prize)
values
  ('first_chapter', 'First chapter', 'Publish your first chapter.', 'book', 100),
  ('page_turner', 'Page turner', 'Complete 10 chapters.', 'flame', 50),
  ('storyteller', 'Storyteller', 'Publish your first story.', 'pencil', 250)
on conflict (code) do nothing;
