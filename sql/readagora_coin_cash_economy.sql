-- Forward migration for purchase-backed creator earnings.
-- Apply after readagora_creator_economy.sql and chapter_coin_unlocks.sql.
-- Cash-outs stay disabled until a Zambia payout provider, FX source, identity
-- checks, and commercial fee schedule have been verified and configured.
begin;

create table if not exists public.creator_cashout_policy (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  payout_processing_enabled boolean not null default false,
  currency char(3) not null default 'ZMW' check (currency = 'ZMW'),
  minimum_minor_units bigint not null default 10000 check (minimum_minor_units > 0),
  payout_cadence text not null default 'MONTHLY' check (payout_cadence in ('MONTHLY')),
  processing_target text not null default '7-14 business days after approval',
  fee_bps integer not null default 0 check (fee_bps between 0 and 10000),
  fee_payer text not null default 'PLATFORM' check (fee_payer in ('PLATFORM','CREATOR')),
  tip_creator_share_bps integer not null default 9000 check (tip_creator_share_bps between 0 and 10000),
  chapter_creator_share_bps integer not null default 7000 check (chapter_creator_share_bps between 0 and 10000),
  fx_usd_zmw_micros bigint,
  fx_observed_at timestamptz,
  supported_methods text[] not null default '{}',
  provider_name text,
  updated_at timestamptz not null default now()
);
alter table public.creator_cashout_policy add column if not exists payout_processing_enabled boolean not null default false;
insert into public.creator_cashout_policy(singleton) values(true) on conflict(singleton) do nothing;

create table if not exists public.creator_cash_accounts (
  writer_id uuid primary key references public.users(id) on delete cascade,
  pending_usd_cents bigint not null default 0 check (pending_usd_cents >= 0),
  available_usd_cents bigint not null default 0 check (available_usd_cents >= 0),
  reserved_usd_cents bigint not null default 0 check (reserved_usd_cents >= 0),
  lifetime_earned_usd_cents bigint not null default 0 check (lifetime_earned_usd_cents >= 0),
  lifetime_paid_usd_cents bigint not null default 0 check (lifetime_paid_usd_cents >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_purchase_lots (
  purchase_transaction_id uuid primary key references public.coin_transactions(id),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id text not null references public.coin_products(product_id),
  coins_issued bigint not null check (coins_issued > 0),
  coins_remaining bigint not null check (coins_remaining >= 0 and coins_remaining <= coins_issued),
  eligible_usd_cents bigint not null default 0 check (eligible_usd_cents >= 0),
  eligible_usd_cents_remaining bigint not null default 0 check (eligible_usd_cents_remaining >= 0 and eligible_usd_cents_remaining <= eligible_usd_cents),
  store_transaction_id text not null unique,
  purchase_currency char(3),
  revenuecat_event_id text,
  eligible_pricing_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists coin_purchase_lots_user_fifo_idx on public.coin_purchase_lots(user_id,created_at,purchase_transaction_id) where coins_remaining > 0;
alter table public.coin_purchase_lots add column if not exists refund_review_required boolean not null default false;

create table if not exists public.coin_purchase_refunds (
  id uuid primary key default gen_random_uuid(),
  purchase_transaction_id uuid not null references public.coin_transactions(id),
  provider_refund_id text not null unique,
  removed_unspent_coins bigint not null default 0 check (removed_unspent_coins >= 0),
  status text not null check (status in ('APPLIED_UNSPENT_COINS','RECONCILIATION_REQUIRED')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_cash_journals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('CHAPTER_UNLOCK','AUTHOR_TIP','PURCHASE_REFUND','PAYOUT_RESERVE','PAYOUT_RELEASE','PAYOUT_PAID','ADJUSTMENT')),
  source_id text not null,
  writer_id uuid references public.users(id) on delete set null,
  coins bigint not null default 0 check (coins >= 0),
  eligible_net_usd_cents bigint not null default 0 check (eligible_net_usd_cents >= 0),
  creator_share_bps integer not null default 0 check (creator_share_bps between 0 and 10000),
  creator_usd_cents bigint not null default 0 check (creator_usd_cents >= 0),
  platform_usd_cents bigint not null default 0 check (platform_usd_cents >= 0),
  exchange_rate_usd_zmw_micros bigint,
  payout_fee_minor_units bigint,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(kind,source_id),
  check (creator_usd_cents + platform_usd_cents = eligible_net_usd_cents)
);

create table if not exists public.creator_cash_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.creator_cash_journals(id) on delete cascade,
  account_code text not null check (account_code in ('UNSPENT_COIN_REVENUE','CREATOR_PENDING','CREATOR_AVAILABLE','CREATOR_RESERVED','CREATOR_PAID','PLATFORM_REVENUE','REFUND_RESERVE','PLATFORM_FEE')),
  user_id uuid references public.users(id) on delete set null,
  debit_usd_cents bigint not null default 0 check (debit_usd_cents >= 0),
  credit_usd_cents bigint not null default 0 check (credit_usd_cents >= 0),
  currency char(3) not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default now(),
  check ((debit_usd_cents > 0)::integer + (credit_usd_cents > 0)::integer = 1)
);
create index if not exists creator_cash_ledger_user_created_idx on public.creator_cash_ledger_entries(user_id,created_at desc);

create or replace function public.assert_creator_cash_journal_balanced()
returns trigger language plpgsql set search_path=public as $$
declare target_id uuid; expected bigint; debits bigint; credits bigint;
begin
  if tg_op='DELETE' then target_id := old.journal_id; else target_id := new.journal_id; end if;
  select eligible_net_usd_cents into expected from public.creator_cash_journals where id=target_id;
  if expected is null then return null; end if;
  select coalesce(sum(debit_usd_cents),0),coalesce(sum(credit_usd_cents),0) into debits,credits
    from public.creator_cash_ledger_entries where journal_id=target_id;
  if expected>0 and (debits<>credits or debits<>expected) then raise exception 'UNBALANCED_CREATOR_CASH_JOURNAL'; end if;
  if expected=0 and (debits<>0 or credits<>0) then raise exception 'UNBALANCED_CREATOR_CASH_JOURNAL'; end if;
  return null;
end; $$;
revoke all on function public.assert_creator_cash_journal_balanced() from public,anon,authenticated;
drop trigger if exists creator_cash_ledger_balanced on public.creator_cash_ledger_entries;
create constraint trigger creator_cash_ledger_balanced after insert or update or delete on public.creator_cash_ledger_entries
  deferrable initially deferred for each row execute function public.assert_creator_cash_journal_balanced();

create table if not exists public.creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  writer_id uuid not null references public.users(id) on delete cascade,
  amount_usd_cents bigint not null check (amount_usd_cents > 0),
  amount_zmw_minor_units bigint not null check (amount_zmw_minor_units > 0),
  fee_zmw_minor_units bigint not null default 0 check (fee_zmw_minor_units >= 0),
  exchange_rate_usd_zmw_micros bigint not null check (exchange_rate_usd_zmw_micros > 0),
  payout_method text not null check (payout_method in ('BANK','MOBILE_MONEY')),
  destination_reference text not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','APPROVED','REJECTED','PROCESSING','PAID','FAILED','CANCELLED')),
  idempotency_key uuid not null,
  provider_reference text,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(writer_id,idempotency_key)
);

alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions add constraint coin_transactions_type_check
  check (type in ('PURCHASE','SUPPORT_SENT','SUPPORT_RECEIVED','CHAPTER_UNLOCK','REFUND','ADMIN_GRANT','BONUS','REVERSAL'));

-- Protect legacy purchase credit from concurrent duplicate webhook deliveries.
create or replace function public.grant_coin_purchase(
  p_user_id uuid, p_product_id text, p_provider_transaction_id text, p_metadata jsonb default '{}'
) returns public.coin_wallets language plpgsql security definer set search_path = public as $$
declare product public.coin_products; result public.coin_wallets; transaction_row public.coin_transactions; eligible_cents bigint;
begin
  if p_provider_transaction_id is null or length(p_provider_transaction_id) = 0 then raise exception 'Provider transaction id required'; end if;
  select * into product from public.coin_products where product_id = p_product_id and enabled for share;
  if not found then raise exception 'Unknown or disabled coin product'; end if;
  insert into public.coin_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select * into result from public.coin_wallets where user_id = p_user_id for update;
  select * into transaction_row from public.coin_transactions where provider = 'revenuecat' and provider_transaction_id = p_provider_transaction_id;
  if found then
    if transaction_row.user_id <> p_user_id or transaction_row.source_id <> p_product_id then raise exception 'PURCHASE_TRANSACTION_MISMATCH'; end if;
    return result;
  end if;
  update public.coin_wallets set balance = balance + product.coins, lifetime_purchased = lifetime_purchased + product.coins, updated_at = now()
    where user_id = p_user_id returning * into result;
  insert into public.coin_transactions(user_id,type,amount,balance_after,provider,provider_transaction_id,source_id,metadata)
    values (p_user_id,'PURCHASE',product.coins,result.balance,'revenuecat',p_provider_transaction_id,p_product_id,p_metadata)
    returning * into transaction_row;

  eligible_cents := greatest(0,coalesce((p_metadata->>'eligible_net_usd_cents')::bigint,0));
  insert into public.coin_purchase_lots(purchase_transaction_id,user_id,product_id,coins_issued,coins_remaining,
    eligible_usd_cents,eligible_usd_cents_remaining,store_transaction_id,purchase_currency,revenuecat_event_id,eligible_pricing_verified)
  values(transaction_row.id,p_user_id,p_product_id,product.coins,product.coins,eligible_cents,eligible_cents,
    p_provider_transaction_id,nullif(p_metadata->>'purchase_currency',''),nullif(p_metadata->>'event_id',''),eligible_cents > 0);
  return result;
end; $$;
revoke all on function public.grant_coin_purchase(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.grant_coin_purchase(uuid,text,text,jsonb) to service_role;

-- Consume eligible purchased revenue FIFO. Non-purchased/received coins carry
-- no cash value. Integer arithmetic assigns all rounding remainder on final use.
create or replace function public.consume_coin_revenue(p_user_id uuid,p_coins bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare lot public.coin_purchase_lots; left_to_consume bigint := p_coins; from_lot bigint; revenue bigint; total bigint := 0;
begin
  for lot in select * from public.coin_purchase_lots where user_id=p_user_id and coins_remaining>0 order by created_at,purchase_transaction_id for update loop
    exit when left_to_consume=0;
    from_lot := least(left_to_consume,lot.coins_remaining);
    if from_lot=lot.coins_remaining then revenue := lot.eligible_usd_cents_remaining;
    else revenue := floor(lot.eligible_usd_cents_remaining::numeric*from_lot/lot.coins_remaining)::bigint; end if;
    update public.coin_purchase_lots set coins_remaining=coins_remaining-from_lot,
      eligible_usd_cents_remaining=eligible_usd_cents_remaining-revenue where purchase_transaction_id=lot.purchase_transaction_id;
    total := total+revenue; left_to_consume := left_to_consume-from_lot;
  end loop;
  if left_to_consume>0 then raise exception 'COIN_LOT_BALANCE_MISMATCH'; end if;
  return total;
end; $$;
revoke all on function public.consume_coin_revenue(uuid,bigint) from public,anon,authenticated;
grant execute on function public.consume_coin_revenue(uuid,bigint) to service_role;

-- New tips use the purchase-backed 90/10 USD-cent allocation and create a
-- double-entry journal. The writer's gifted coins are not re-cashable lots.
create or replace function public.send_coin_support(p_reader_id uuid,p_story_id uuid,p_coins bigint,p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.stories; reader_wallet public.coin_wallets; writer_balance bigint; support_id uuid;
  net_cents bigint; creator_cents bigint; platform_cents bigint; journal uuid; prior public.creator_cash_journals; share_bps integer;
begin
  if p_coins is null or p_coins<1 or p_coins>800 then raise exception 'INVALID_SUPPORT_AMOUNT'; end if;
  if p_idempotency_key is null then raise exception 'INVALID_SUPPORT_IDEMPOTENCY_KEY'; end if;
  select * into s from public.stories where id=p_story_id and status='published' for share;
  if not found then raise exception 'STORY_NOT_FOUND'; end if;
  if s.author_id=p_reader_id then raise exception 'SELF_SUPPORT_NOT_ALLOWED'; end if;
  select * into prior from public.creator_cash_journals where kind='AUTHOR_TIP' and source_id=p_idempotency_key::text;
  if found then
    if prior.writer_id<>s.author_id or prior.coins<>p_coins or prior.metadata->>'story_id'<>p_story_id::text then raise exception 'COIN_SUPPORT_IDEMPOTENCY_MISMATCH'; end if;
    select * into reader_wallet from public.coin_wallets where user_id=p_reader_id;
    return jsonb_build_object('supportId',prior.metadata->>'support_id','coins',prior.coins,'balance',reader_wallet.balance,
      'writerId',prior.writer_id,'storyTitle',s.title,'creatorEarningsUsdCents',prior.creator_usd_cents,'duplicate',true);
  end if;
  insert into public.coin_wallets(user_id) values(p_reader_id) on conflict do nothing;
  insert into public.coin_wallets(user_id) values(s.author_id) on conflict do nothing;
  perform user_id from public.coin_wallets where user_id in (p_reader_id,s.author_id) order by user_id for update;
  select * into reader_wallet from public.coin_wallets where user_id=p_reader_id for update;
  if reader_wallet.balance<p_coins then raise exception 'INSUFFICIENT_COINS'; end if;
  update public.coin_wallets set balance=balance-p_coins,lifetime_spent=lifetime_spent+p_coins,updated_at=now()
    where user_id=p_reader_id returning * into reader_wallet;
  net_cents := public.consume_coin_revenue(p_reader_id,p_coins);
  select tip_creator_share_bps into share_bps from public.creator_cashout_policy where singleton;
  creator_cents := floor(net_cents::numeric*share_bps/10000)::bigint; platform_cents := net_cents-creator_cents;
  insert into public.coin_support_events(reader_id,writer_id,coins) values(p_reader_id,s.author_id,p_coins) returning id into support_id;
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(p_reader_id,'SUPPORT_SENT',-p_coins,reader_wallet.balance,support_id::text,jsonb_build_object('story_id',p_story_id,'writer_id',s.author_id));
  insert into public.coin_wallets(user_id) values(s.author_id) on conflict do nothing;
  update public.coin_wallets set balance=balance+p_coins,updated_at=now() where user_id=s.author_id returning balance into writer_balance;
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(s.author_id,'SUPPORT_RECEIVED',p_coins,writer_balance,support_id::text,jsonb_build_object('story_id',p_story_id,'reader_id',p_reader_id));
  insert into public.creator_cash_journals(kind,source_id,writer_id,coins,eligible_net_usd_cents,creator_share_bps,creator_usd_cents,platform_usd_cents)
    values('AUTHOR_TIP',p_idempotency_key::text,s.author_id,p_coins,net_cents,share_bps,creator_cents,platform_cents)
    returning id into journal;
  update public.creator_cash_journals set metadata=jsonb_build_object('support_id',support_id,'story_id',p_story_id) where id=journal;
  if net_cents>0 then
    insert into public.creator_cash_ledger_entries(journal_id,account_code,debit_usd_cents) values(journal,'UNSPENT_COIN_REVENUE',net_cents);
    if creator_cents>0 then
      insert into public.creator_cash_ledger_entries(journal_id,account_code,user_id,credit_usd_cents) values(journal,'CREATOR_PENDING',s.author_id,creator_cents);
      insert into public.creator_cash_accounts(writer_id,pending_usd_cents,lifetime_earned_usd_cents) values(s.author_id,creator_cents,creator_cents)
        on conflict(writer_id) do update set pending_usd_cents=creator_cash_accounts.pending_usd_cents+excluded.pending_usd_cents,
          lifetime_earned_usd_cents=creator_cash_accounts.lifetime_earned_usd_cents+excluded.lifetime_earned_usd_cents,updated_at=now();
    end if;
    if platform_cents>0 then insert into public.creator_cash_ledger_entries(journal_id,account_code,credit_usd_cents) values(journal,'PLATFORM_REVENUE',platform_cents); end if;
  end if;
  return jsonb_build_object('supportId',support_id,'coins',p_coins,'balance',reader_wallet.balance,'writerId',s.author_id,'storyTitle',s.title,'creatorEarningsUsdCents',creator_cents);
end; $$;
revoke all on function public.send_coin_support(uuid,uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.send_coin_support(uuid,uuid,bigint,uuid) to service_role;

-- Replace chapter unlock RPC to allocate 70% of purchase-backed eligible net
-- proceeds to the author's pending USD-cent account, exactly once per unlock.
create or replace function public.unlock_chapter_with_coins(p_user_id uuid,p_chapter_id uuid,p_expected_price integer,p_minimum_free integer default 3)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.chapters; s public.stories; w public.coin_wallets; chapter_index integer;
  net_cents bigint; creator_cents bigint; platform_cents bigint; journal uuid; share_bps integer;
begin
  select * into c from public.chapters where id=p_chapter_id for update;
  if not found then raise exception 'CHAPTER_NOT_FOUND'; end if;
  select * into s from public.stories where id=c.story_id for share;
  if c.status<>'published' or not public.discovery_can_read_story(c.story_id,p_user_id) then raise exception 'CHAPTER_NOT_FOUND'; end if;
  select count(*) into chapter_index from public.chapters where story_id=c.story_id and status='published' and chapter_order<c.chapter_order;
  if s.author_id=p_user_id or s.access_type is distinct from 'PREMIUM' or s.monetization_enabled is distinct from true
    or chapter_index<greatest(3,p_minimum_free,coalesce(s.free_chapter_count,3)) then return jsonb_build_object('accessible',true,'charged',0,'reason','FREE'); end if;
  if exists(select 1 from public.subscriptions where user_id=p_user_id and status in ('ACTIVE','GRACE_PERIOD') and (current_period_end is null or current_period_end>now()))
    then return jsonb_build_object('accessible',true,'charged',0,'reason','PREMIUM'); end if;
  insert into public.coin_wallets(user_id) values(p_user_id) on conflict do nothing;
  select * into w from public.coin_wallets where user_id=p_user_id for update;
  if exists(select 1 from public.chapter_coin_unlocks where user_id=p_user_id and chapter_id=p_chapter_id)
    then return jsonb_build_object('accessible',true,'charged',0,'reason','COIN_UNLOCK','balance',w.balance); end if;
  if p_expected_price is distinct from c.coin_price then raise exception 'COIN_PRICE_CHANGED'; end if;
  if w.balance<c.coin_price then raise exception 'INSUFFICIENT_COINS'; end if;
  update public.coin_wallets set balance=balance-c.coin_price,lifetime_spent=lifetime_spent+c.coin_price,updated_at=now()
    where user_id=p_user_id returning * into w;
  insert into public.chapter_coin_unlocks(user_id,chapter_id,coins_spent) values(p_user_id,p_chapter_id,c.coin_price);
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(p_user_id,'CHAPTER_UNLOCK',-c.coin_price,w.balance,p_chapter_id::text,jsonb_build_object('chapter_id',p_chapter_id,'story_id',c.story_id));
  net_cents := public.consume_coin_revenue(p_user_id,c.coin_price);
  select chapter_creator_share_bps into share_bps from public.creator_cashout_policy where singleton;
  creator_cents := floor(net_cents::numeric*share_bps/10000)::bigint; platform_cents := net_cents-creator_cents;
  insert into public.creator_cash_journals(kind,source_id,writer_id,coins,eligible_net_usd_cents,creator_share_bps,creator_usd_cents,platform_usd_cents)
    values('CHAPTER_UNLOCK',p_user_id::text||':'||p_chapter_id::text,s.author_id,c.coin_price,net_cents,share_bps,creator_cents,platform_cents) returning id into journal;
  if net_cents>0 then
    insert into public.creator_cash_ledger_entries(journal_id,account_code,debit_usd_cents) values(journal,'UNSPENT_COIN_REVENUE',net_cents);
    if creator_cents>0 then
      insert into public.creator_cash_ledger_entries(journal_id,account_code,user_id,credit_usd_cents) values(journal,'CREATOR_PENDING',s.author_id,creator_cents);
      insert into public.creator_cash_accounts(writer_id,pending_usd_cents,lifetime_earned_usd_cents) values(s.author_id,creator_cents,creator_cents)
        on conflict(writer_id) do update set pending_usd_cents=creator_cash_accounts.pending_usd_cents+excluded.pending_usd_cents,
          lifetime_earned_usd_cents=creator_cash_accounts.lifetime_earned_usd_cents+excluded.lifetime_earned_usd_cents,updated_at=now();
    end if;
    if platform_cents>0 then insert into public.creator_cash_ledger_entries(journal_id,account_code,credit_usd_cents) values(journal,'PLATFORM_REVENUE',platform_cents); end if;
  end if;
  return jsonb_build_object('accessible',true,'charged',c.coin_price,'reason','COIN_UNLOCK','balance',w.balance,'creatorEarningsUsdCents',creator_cents);
end; $$;
revoke all on function public.unlock_chapter_with_coins(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.unlock_chapter_with_coins(uuid,uuid,integer,integer) to service_role;

-- RevenueCat refunds safely remove coins that remain unspent. If any coins
-- from the pack were already consumed, flag the purchase for accounting review
-- because historical lot-to-earnings attribution must be reversed explicitly.
create or replace function public.reverse_coin_purchase(p_user_id uuid,p_store_transaction_id text,p_refund_event_id text,p_metadata jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public as $$
declare lot public.coin_purchase_lots; purchase public.coin_transactions; w public.coin_wallets; removed bigint; was_spent boolean;
begin
  if nullif(p_refund_event_id,'') is null then raise exception 'REFUND_EVENT_ID_REQUIRED'; end if;
  if exists(select 1 from public.coin_purchase_refunds where provider_refund_id=p_refund_event_id) then
    return jsonb_build_object('duplicate',true);
  end if;
  select * into purchase from public.coin_transactions where provider='revenuecat' and provider_transaction_id=p_store_transaction_id and user_id=p_user_id;
  if not found then raise exception 'COIN_PURCHASE_NOT_FOUND'; end if;
  insert into public.coin_wallets(user_id) values(p_user_id) on conflict do nothing;
  select * into w from public.coin_wallets where user_id=p_user_id for update;
  if not found then raise exception 'COIN_WALLET_NOT_FOUND'; end if;
  -- Spending locks wallet then purchase lots; refunds follow the same order.
  select * into lot from public.coin_purchase_lots where purchase_transaction_id=purchase.id for update;
  if lot.purchase_transaction_id is null then
    insert into public.coin_purchase_refunds(purchase_transaction_id,provider_refund_id,status,metadata)
      values(purchase.id,p_refund_event_id,'RECONCILIATION_REQUIRED',p_metadata);
    return jsonb_build_object('duplicate',false,'requiresReconciliation',true,'removedCoins',0);
  end if;
  removed := lot.coins_remaining;
  was_spent := lot.coins_remaining < lot.coins_issued;
  if removed>w.balance then raise exception 'REFUND_WALLET_BALANCE_MISMATCH'; end if;
  if removed>0 then
    update public.coin_wallets set balance=balance-removed,updated_at=now() where user_id=p_user_id returning * into w;
    insert into public.coin_transactions(user_id,type,amount,balance_after,provider,provider_transaction_id,source_id,metadata)
      values(p_user_id,'REFUND',-removed,w.balance,'revenuecat',p_refund_event_id,purchase.id::text,p_metadata);
  end if;
  update public.coin_purchase_lots set coins_remaining=0,eligible_usd_cents_remaining=0,refund_review_required=was_spent
    where purchase_transaction_id=purchase.id;
  insert into public.coin_purchase_refunds(purchase_transaction_id,provider_refund_id,removed_unspent_coins,status,metadata)
    values(purchase.id,p_refund_event_id,removed,case when was_spent then 'RECONCILIATION_REQUIRED' else 'APPLIED_UNSPENT_COINS' end,p_metadata);
  return jsonb_build_object('duplicate',false,'requiresReconciliation',was_spent,'removedCoins',removed,'balance',w.balance);
end; $$;
revoke all on function public.reverse_coin_purchase(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reverse_coin_purchase(uuid,text,text,jsonb) to service_role;

create or replace function public.get_creator_cashout_quote(p_writer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare policy public.creator_cashout_policy; account public.creator_cash_accounts;
begin
  select * into policy from public.creator_cashout_policy where singleton;
  select * into account from public.creator_cash_accounts where writer_id=p_writer_id;
  return jsonb_build_object('enabled',policy.enabled and policy.payout_processing_enabled and policy.provider_name is not null and policy.fx_usd_zmw_micros is not null and cardinality(policy.supported_methods)>0,
    'currency',policy.currency,'minimumMinorUnits',policy.minimum_minor_units,'cadence',policy.payout_cadence,
    'processingTarget',policy.processing_target,'feeBps',policy.fee_bps,'feePayer',policy.fee_payer,
    'exchangeRateUsdZmwMicros',policy.fx_usd_zmw_micros,'exchangeRateObservedAt',policy.fx_observed_at,
    'supportedMethods',policy.supported_methods,'availableUsdCents',coalesce(account.available_usd_cents,0),
    'reason',case when not policy.enabled then 'PAYOUTS_DISABLED_PENDING_PROVIDER_AND_POLICY_VERIFICATION'
      when not policy.payout_processing_enabled then 'PAYOUT_PROCESSING_NOT_IMPLEMENTED'
      when policy.provider_name is null then 'PAYOUT_PROVIDER_NOT_CONFIGURED' when policy.fx_usd_zmw_micros is null then 'EXCHANGE_RATE_NOT_CONFIGURED'
      when cardinality(policy.supported_methods)=0 then 'PAYOUT_METHODS_NOT_CONFIGURED' else null end);
end; $$;
revoke all on function public.get_creator_cashout_quote(uuid) from public,anon,authenticated;
grant execute on function public.get_creator_cashout_quote(uuid) to service_role;

alter table public.creator_cashout_policy enable row level security;
alter table public.creator_cash_accounts enable row level security;
alter table public.coin_purchase_lots enable row level security;
alter table public.coin_purchase_refunds enable row level security;
alter table public.creator_cash_journals enable row level security;
alter table public.creator_cash_ledger_entries enable row level security;
alter table public.creator_payout_requests enable row level security;
revoke all on public.creator_cashout_policy,public.creator_cash_accounts,public.coin_purchase_lots,public.coin_purchase_refunds,public.creator_cash_journals,public.creator_cash_ledger_entries,public.creator_payout_requests from anon,authenticated;
grant all on public.creator_cashout_policy,public.creator_cash_accounts,public.coin_purchase_lots,public.coin_purchase_refunds,public.creator_cash_journals,public.creator_cash_ledger_entries,public.creator_payout_requests to service_role;

commit;
