-- Additive creator wallet and Agora Coins foundation.
-- Apply after readagora_premium_access.sql and the base wallet schema.
begin;


create table if not exists public.creator_wallets (
  writer_id uuid primary key references public.users(id) on delete cascade,
  pending_balance numeric(14,2) not null default 0 check (pending_balance >= 0),
  available_balance numeric(14,2) not null default 0 check (available_balance >= 0),
  lifetime_earnings numeric(14,2) not null default 0 check (lifetime_earnings >= 0),
  lifetime_paid numeric(14,2) not null default 0 check (lifetime_paid >= 0),
  currency text not null default 'ZAR' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  writer_id uuid not null references public.users(id) on delete cascade,
  source_type text not null check (source_type in ('CREATOR_POOL','COIN_SUPPORT','BONUS','ORIGINAL_ADVANCE','ORIGINAL_REVENUE_SHARE','AD_REVENUE','ADJUSTMENT','REVERSAL')),
  source_id text,
  amount numeric(14,2) not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'PENDING' check (status in ('PENDING','AVAILABLE','PAID','REVERSED','HELD')),
  description text not null default '',
  available_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_earnings_writer_created_idx on public.creator_earnings_ledger(writer_id, created_at desc);

create table if not exists public.reading_engagement_events (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.users(id) on delete cascade,
  writer_id uuid not null references public.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  session_id text not null,
  qualification_status text not null default 'PENDING' check (qualification_status in ('PENDING','QUALIFIED','REJECTED','FLAGGED')),
  premium_reader boolean not null default false,
  reading_duration_seconds integer not null default 0 check (reading_duration_seconds >= 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  completed boolean not null default false,
  is_offline boolean not null default false,
  opened_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(reader_id, session_id, chapter_id),
  check (reader_id <> writer_id)
);
create index if not exists reading_engagement_writer_created_idx on public.reading_engagement_events(writer_id, created_at desc) where qualification_status = 'QUALIFIED';

create table if not exists public.coin_support_events (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null references public.users(id) on delete cascade,
  writer_id uuid not null references public.users(id) on delete cascade,
  coins bigint not null check (coins > 0),
  created_at timestamptz not null default now(),
  check (reader_id <> writer_id)
);
create index if not exists coin_support_writer_created_idx on public.coin_support_events(writer_id, created_at desc);

create table if not exists public.coin_wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_purchased bigint not null default 0 check (lifetime_purchased >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.coin_products (
  product_id text primary key,
  coins bigint not null check (coins > 0),
  display_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('PURCHASE','SUPPORT_SENT','SUPPORT_RECEIVED','CHAPTER_UNLOCK','REFUND','ADMIN_GRANT','BONUS','REVERSAL')),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null check (balance_after >= 0),
  provider text,
  provider_transaction_id text,
  source_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions add constraint coin_transactions_type_check
  check (type in ('PURCHASE','SUPPORT_SENT','SUPPORT_RECEIVED','CHAPTER_UNLOCK','REFUND','ADMIN_GRANT','BONUS','REVERSAL'));
create unique index if not exists coin_transactions_provider_transaction_uidx
  on public.coin_transactions(provider, provider_transaction_id) where provider_transaction_id is not null;
create index if not exists coin_transactions_user_created_idx on public.coin_transactions(user_id, created_at desc);

insert into public.coin_products(product_id, coins, display_name) values
  ('agora_coins_50', 50, '50 coins'),
  ('agora_coins_120', 120, '120 coins'),
  ('agora_coins_300', 300, '300 coins'),
  ('agora_coins_800', 800, '800 coins')
on conflict (product_id) do nothing;

create or replace function public.grant_coin_purchase(
  p_user_id uuid, p_product_id text, p_provider_transaction_id text, p_metadata jsonb default '{}'
) returns public.coin_wallets language plpgsql security definer set search_path = public as $$
declare product public.coin_products; result public.coin_wallets;
begin
  if p_provider_transaction_id is null or length(p_provider_transaction_id) = 0 then raise exception 'Provider transaction id required'; end if;
  select * into product from public.coin_products where product_id = p_product_id and enabled;
  if product.product_id is null then raise exception 'Unknown or disabled coin product'; end if;
  insert into public.coin_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  if exists(select 1 from public.coin_transactions where provider = 'revenuecat' and provider_transaction_id = p_provider_transaction_id) then
    select * into result from public.coin_wallets where user_id = p_user_id;
    return result;
  end if;
  update public.coin_wallets set balance = balance + product.coins, lifetime_purchased = lifetime_purchased + product.coins, updated_at = now()
    where user_id = p_user_id returning * into result;
  insert into public.coin_transactions(user_id,type,amount,balance_after,provider,provider_transaction_id,source_id,metadata)
    values (p_user_id,'PURCHASE',product.coins,result.balance,'revenuecat',p_provider_transaction_id,p_product_id,p_metadata);
  return result;
end; $$;
revoke all on function public.grant_coin_purchase(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.grant_coin_purchase(uuid,text,text,jsonb) to service_role;

-- Readers can send coins to a published story's author. The wallet debit,
-- support event and linked transaction records commit as one unit.
create or replace function public.send_coin_support(
  p_reader_id uuid, p_story_id uuid, p_coins bigint
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.stories;
  w public.coin_wallets;
  support_id uuid;
  writer_balance bigint;
begin
  if p_coins is null or p_coins < 1 or p_coins > 800 then raise exception 'INVALID_SUPPORT_AMOUNT'; end if;
  select * into s from public.stories where id = p_story_id and status = 'published' for share;
  if not found then raise exception 'STORY_NOT_FOUND'; end if;
  if s.author_id = p_reader_id then raise exception 'SELF_SUPPORT_NOT_ALLOWED'; end if;

  insert into public.coin_wallets(user_id) values(p_reader_id) on conflict (user_id) do nothing;
  select * into w from public.coin_wallets where user_id = p_reader_id for update;
  if w.balance < p_coins then raise exception 'INSUFFICIENT_COINS'; end if;

  update public.coin_wallets set balance = balance - p_coins,
    lifetime_spent = lifetime_spent + p_coins, updated_at = now()
    where user_id = p_reader_id returning * into w;

  insert into public.coin_support_events(reader_id,writer_id,coins)
    values(p_reader_id,s.author_id,p_coins) returning id into support_id;
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(p_reader_id,'SUPPORT_SENT',-p_coins,w.balance,support_id::text,
      jsonb_build_object('story_id',p_story_id,'writer_id',s.author_id));

  insert into public.coin_wallets(user_id) values(s.author_id) on conflict (user_id) do nothing;
  update public.coin_wallets set balance = balance + p_coins, updated_at = now()
    where user_id = s.author_id returning balance into writer_balance;
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(s.author_id,'SUPPORT_RECEIVED',p_coins,writer_balance,support_id::text,
      jsonb_build_object('story_id',p_story_id,'reader_id',p_reader_id));

  return jsonb_build_object('supportId',support_id,'coins',p_coins,'balance',w.balance,'writerId',s.author_id,'storyTitle',s.title);
end; $$;
revoke all on function public.send_coin_support(uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function public.send_coin_support(uuid,uuid,bigint) to service_role;

alter table public.creator_wallets enable row level security;
alter table public.creator_earnings_ledger enable row level security;
alter table public.reading_engagement_events enable row level security;
alter table public.coin_support_events enable row level security;
alter table public.coin_wallets enable row level security;
alter table public.coin_products enable row level security;
alter table public.coin_transactions enable row level security;
revoke all on public.creator_wallets, public.creator_earnings_ledger, public.reading_engagement_events, public.coin_support_events, public.coin_wallets, public.coin_products, public.coin_transactions from anon, authenticated;
grant all on public.creator_wallets, public.creator_earnings_ledger, public.reading_engagement_events, public.coin_support_events, public.coin_wallets, public.coin_products, public.coin_transactions to service_role;

commit;
