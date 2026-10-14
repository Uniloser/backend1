-- Isolated disposable PostgreSQL database only. Never run on a real app database.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create extension if not exists pgcrypto;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.users(id uuid primary key);
create table public.stories(
 id uuid primary key, author_id uuid references users, title text not null, status text not null,
 access_type text not null default 'FREE', monetization_enabled boolean not null default false, free_chapter_count integer not null default 3
);
create table public.chapters(id uuid primary key,story_id uuid references stories,chapter_order integer,status text,coin_price integer not null default 5);
create table public.subscriptions(user_id uuid,status text,current_period_end timestamptz);
create table public.comic_panels(id uuid primary key,chapter_id uuid references chapters);
create table public.speech_bubbles(id uuid primary key,panel_id uuid references comic_panels);
create function public.discovery_can_read_story(p_story uuid,p_user uuid) returns boolean language sql stable as $$ select exists(select 1 from stories where id=p_story and status='published') $$;
\ir ../sql/readagora_creator_economy.sql
alter table chapters enable row level security;
alter table comic_panels enable row level security;
alter table speech_bubbles enable row level security;
create policy test_public_read on chapters for select using(true);
grant usage on schema public,auth to anon,authenticated;
grant select on chapters,comic_panels,speech_bubbles to anon,authenticated;
\ir ../sql/chapter_coin_unlocks.sql
\ir ../sql/readagora_coin_cash_economy.sql
\ir ../sql/creator_payout_workflow.sql

insert into public.users(id) values
 ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
insert into public.stories(id,author_id,title,status,access_type,monetization_enabled,free_chapter_count) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Test story','published','PREMIUM',true,3),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','Other story','published','FREE',false,3);
insert into public.chapters(id,story_id,chapter_order,status) select
 ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',i,'published' from generate_series(1,4) i;
insert into public.coin_wallets(user_id) values('00000000-0000-4000-8000-000000000001');

do $$
declare purchase_wallet public.coin_wallets; result jsonb; key uuid := '30000000-0000-4000-8000-000000000001'; before_balance bigint;
begin
  purchase_wallet := public.grant_coin_purchase('00000000-0000-4000-8000-000000000001','agora_coins_50','store-tx-1',
    '{"eligible_net_usd_cents":25,"purchase_currency":"USD","event_id":"event-1"}'::jsonb);
  perform public.grant_coin_purchase('00000000-0000-4000-8000-000000000001','agora_coins_50','store-tx-1',
    '{"eligible_net_usd_cents":25}'::jsonb);
  assert (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001')=50, 'duplicate purchase credited twice';
  assert (select count(*) from coin_transactions where provider_transaction_id='store-tx-1')=1, 'duplicate purchase transaction';

  result := public.unlock_chapter_with_coins('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000004',5);
  assert (result->>'charged')::bigint=5, 'chapter unlock did not debit';
  assert (select pending_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=1, 'chapter creator share incorrect';

  result := public.send_coin_support('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',10,key);
  assert (result->>'creatorEarningsUsdCents')::bigint=4, 'tip creator share incorrect';
  before_balance := (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001');
  result := public.send_coin_support('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',10,key);
  assert (result->>'duplicate')::boolean, 'tip retry not identified';
  assert (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001')=before_balance, 'tip retry debited twice';
  assert (select count(*) from coin_support_events)=1, 'tip retry wrote duplicate support event';

  result := public.reverse_coin_purchase('00000000-0000-4000-8000-000000000001','store-tx-1','refund-event-1','{"type":"REFUND"}'::jsonb);
  assert (result->>'requiresReconciliation')::boolean, 'spent purchase refund did not require earnings reconciliation';
  assert (result->>'removedCoins')::bigint=35, 'unspent refunded coin amount incorrect';
  assert (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001')=0, 'refund did not remove remaining coins';
  result := public.reverse_coin_purchase('00000000-0000-4000-8000-000000000001','store-tx-1','refund-event-1','{}'::jsonb);
  assert (result->>'duplicate')::boolean, 'refund retry not idempotent';

  perform public.grant_coin_purchase('00000000-0000-4000-8000-000000000001','agora_coins_50','store-tx-2',
    '{"eligible_net_usd_cents":20,"purchase_currency":"USD"}'::jsonb);
  result := public.reverse_coin_purchase('00000000-0000-4000-8000-000000000001','store-tx-2','refund-event-2','{}'::jsonb);
  assert not (result->>'requiresReconciliation')::boolean and (result->>'removedCoins')::bigint=50, 'unspent purchase refund failed';
  assert (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001')=0, 'unspent refund left coins in wallet';

  begin
    perform public.send_coin_support('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1,'30000000-0000-4000-8000-000000000002');
    raise exception 'expected self-tip rejection';
  exception when raise_exception then if sqlerrm <> 'SELF_SUPPORT_NOT_ALLOWED' then raise; end if; end;

  assert not (public.get_creator_cashout_quote('00000000-0000-4000-8000-000000000002')->>'enabled')::boolean, 'cash-outs should default disabled';
  assert (select count(*) from creator_cash_ledger_entries where journal_id in (select id from creator_cash_journals))>0, 'financial journal entries missing';
  assert not exists(select 1 from creator_cash_journals j where
    (select coalesce(sum(debit_usd_cents),0) from creator_cash_ledger_entries e where e.journal_id=j.id)<>
    (select coalesce(sum(credit_usd_cents),0) from creator_cash_ledger_entries e where e.journal_id=j.id)), 'double-entry journal is unbalanced';
  assert not has_function_privilege('authenticated','public.send_coin_support(uuid,uuid,bigint,uuid)','execute'), 'client can invoke support RPC directly';
  assert not has_function_privilege('authenticated','public.reverse_coin_purchase(uuid,text,text,jsonb)','execute'), 'client can reverse purchases directly';

  update public.creator_cash_accounts set available_usd_cents=3000
    where writer_id='00000000-0000-4000-8000-000000000002';
  update public.creator_cashout_policy set enabled=true, payout_processing_enabled=true,
    provider_name='manual-test-provider', fx_usd_zmw_micros=20000000,
    supported_methods=array['MOBILE_MONEY'], fee_bps=0
    where singleton;
  result := public.fund_creator_payout_reserve(
    '00000000-0000-4000-8000-000000000003', 30000, 'test-funding-1', 'Fixture funding',
    '30000000-0000-4000-8000-000000000010'
  );
  assert (result->>'availableMinorUnits')::bigint=30000, 'reserve funding failed';
  result := public.fund_creator_payout_reserve(
    '00000000-0000-4000-8000-000000000003', 30000, 'test-funding-1', 'Fixture funding',
    '30000000-0000-4000-8000-000000000010'
  );
  assert (result->>'duplicate')::boolean, 'reserve funding retry was not idempotent';

  result := public.request_creator_payout(
    '00000000-0000-4000-8000-000000000002', 10000, 'MOBILE_MONEY', '+260971234567',
    '30000000-0000-4000-8000-000000000011'
  );
  assert result->>'status'='REQUESTED' and result->>'destinationHint'='*********4567', 'payout request failed or exposed destination';
  assert (select available_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=2500, 'request did not reserve creator funds';
  result := public.request_creator_payout(
    '00000000-0000-4000-8000-000000000002', 10000, 'MOBILE_MONEY', '+260971234567',
    '30000000-0000-4000-8000-000000000011'
  );
  assert (result->>'duplicate')::boolean, 'payout request retry was not idempotent';
  result := public.review_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','reject','Reject fixture request');
  assert result->>'status'='REJECTED', 'payout rejection failed';
  assert (select available_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=3000
    and (select reserved_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=0,
    'rejected payout did not release creator funds exactly once';

  result := public.request_creator_payout(
    '00000000-0000-4000-8000-000000000002', 10000, 'MOBILE_MONEY', '+260971234567',
    '30000000-0000-4000-8000-000000000012'
  );
  result := public.review_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','approve','Approve fixture request');
  assert result->>'status'='APPROVED' and result->>'reserveState'='HELD', 'payout approval did not hold reserve';
  assert (select available_minor_units from creator_payout_reserve where singleton)=20000
    and (select held_minor_units from creator_payout_reserve where singleton)=10000,
    'reserve hold was not atomic';
  result := public.start_creator_payout_transfer((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003');
  assert result->>'status'='PROCESSING', 'manual transfer start failed';
  result := public.reconcile_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','uncertain',null,'Check transfer outcome');
  assert result->>'status'='PROCESSING' and result->>'paymentOutcome'='UNCERTAIN', 'uncertain payment was not held for reconciliation';
  result := public.reconcile_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','paid','manual-ref-2','Transfer confirmed');
  assert result->>'status'='PAID' and result->>'reserveState'='PAID', 'confirmed payout was not completed';
  assert (select lifetime_paid_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=500
    and (select reserved_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=0,
    'confirmed payout did not update creator liability';
  assert (select held_minor_units from creator_payout_reserve where singleton)=0, 'paid payout left reserve funds held';

  result := public.request_creator_payout(
    '00000000-0000-4000-8000-000000000002', 10000, 'MOBILE_MONEY', '+260971234567',
    '30000000-0000-4000-8000-000000000013'
  );
  result := public.review_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','approve','Approve failed fixture request');
  result := public.start_creator_payout_transfer((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003');
  result := public.reconcile_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','failed',null,'Transfer confirmed not sent');
  assert result->>'status'='FAILED' and result->>'reserveState'='RELEASED', 'failed payout did not enter recovery state';
  assert (select available_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=2500
    and (select reserved_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=0,
    'failed payout did not release creator funds exactly once';
  assert (select available_minor_units from creator_payout_reserve where singleton)=20000
    and (select held_minor_units from creator_payout_reserve where singleton)=0,
    'failed payout did not release held reserve';

  result := public.request_creator_payout(
    '00000000-0000-4000-8000-000000000002', 25000, 'MOBILE_MONEY', '+260971234567',
    '30000000-0000-4000-8000-000000000014'
  );
  result := public.review_creator_payout((result->>'id')::uuid,'00000000-0000-4000-8000-000000000003','approve','Approve pending reserve fixture');
  assert result->>'status'='APPROVED' and result->>'reserveState'='AWAITING_RESERVE'
    and result->>'reason'='PAYOUT_RESERVE_INSUFFICIENT', 'insufficient reserve did not retain request unpaid';
  assert (select held_minor_units from creator_payout_reserve where singleton)=0,
    'insufficient reserve created a partial cash hold';
  assert (select reserved_usd_cents from creator_cash_accounts where writer_id='00000000-0000-4000-8000-000000000002')=1250,
    'approved unpaid request failed to retain reserved creator liability';
  assert not has_function_privilege('authenticated','public.request_creator_payout(uuid,bigint,text,text,uuid)','execute'),
    'client can invoke payout RPC directly';
end $$;

select 'Agora coin cash economy assertions passed' as result;
