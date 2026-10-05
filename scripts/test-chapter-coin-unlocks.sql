-- Isolated PostgreSQL fixture only. Never run this file against an application database.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.users(id uuid primary key);
create table public.stories(id uuid primary key, author_id uuid, access_type text, monetization_enabled boolean, free_chapter_count integer, status text);
create table public.chapters(id uuid primary key, story_id uuid references stories, chapter_order integer, status text);
create table public.subscriptions(user_id uuid, status text, current_period_end timestamptz);
create table public.coin_wallets(user_id uuid primary key references users, balance bigint not null default 0 check(balance>=0), lifetime_purchased bigint not null default 0, lifetime_spent bigint not null default 0, updated_at timestamptz default now());
create table public.coin_transactions(id bigserial primary key,user_id uuid,type text,amount bigint,balance_after bigint,source_id text,metadata jsonb);
create table public.comic_panels(id uuid primary key,chapter_id uuid references chapters);
create table public.speech_bubbles(id uuid primary key,panel_id uuid references comic_panels);
create function public.discovery_can_read_story(p_story uuid,p_user uuid) returns boolean language sql as $$ select exists(select 1 from stories where id=p_story and status='published') $$;
alter table chapters enable row level security;
alter table comic_panels enable row level security;
alter table speech_bubbles enable row level security;
create policy test_public_read on chapters for select using(true);
grant usage on schema public,auth to anon,authenticated;
grant select on chapters,comic_panels,speech_bubbles to anon,authenticated;
\ir ../sql/chapter_coin_unlocks.sql
insert into users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
insert into stories values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','PREMIUM',true,3,'published');
insert into chapters(id,story_id,chapter_order,status)
 select ('20000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',i,'published' from generate_series(1,8) i;
insert into coin_wallets(user_id,balance) values('00000000-0000-4000-8000-000000000001',10);
do $$
declare u uuid := '00000000-0000-4000-8000-000000000001'; c uuid := '20000000-0000-4000-8000-000000000004'; result jsonb;
begin
 result := unlock_chapter_with_coins(u,'20000000-0000-4000-8000-000000000001',5);
 assert (result->>'charged')::int=0, 'free chapter charged';
 insert into subscriptions values(u,'ACTIVE',now()+interval '1 day');
 result := unlock_chapter_with_coins(u,c,5);
 assert result->>'reason'='PREMIUM' and (result->>'charged')::int=0, 'subscriber charged';
 assert not exists(select 1 from chapter_coin_unlocks), 'subscriber received unnecessary permanent unlock';
 update subscriptions set status='EXPIRED';
 result := unlock_chapter_with_coins(u,c,5);
 assert (result->>'charged')::int=5 and (result->>'balance')::int=5, 'incorrect debit';
 result := unlock_chapter_with_coins(u,c,999);
 assert (result->>'charged')::int=0, 'duplicate charged or price rechecked for owned chapter';
 assert (select count(*) from coin_transactions)=1, 'duplicate ledger entry';
 assert (select lifetime_spent from coin_wallets where user_id=u)=5, 'wrong lifetime spent';
 begin
  perform unlock_chapter_with_coins(u,'20000000-0000-4000-8000-000000000005',1);
  raise exception 'expected price conflict';
 exception when raise_exception then if sqlerrm <> 'COIN_PRICE_CHANGED' then raise; end if; end;
 begin
  perform unlock_chapter_with_coins('00000000-0000-4000-8000-000000000003',c,5);
  raise exception 'expected insufficient balance';
 exception when raise_exception then if sqlerrm <> 'INSUFFICIENT_COINS' then raise; end if; end;
 update chapters set status='draft' where id='20000000-0000-4000-8000-000000000006';
 begin
  perform unlock_chapter_with_coins(u,'20000000-0000-4000-8000-000000000006',5);
  raise exception 'expected unpublished rejection';
 exception when raise_exception then if sqlerrm <> 'CHAPTER_NOT_FOUND' then raise; end if; end;
 assert exists(select 1 from chapter_coin_unlocks where user_id=u and chapter_id=c), 'unlock lost after subscription expiry';
 assert not exists(select 1 from chapter_coin_unlocks where user_id='00000000-0000-4000-8000-000000000003'), 'unlock leaked to another user';
 assert not has_function_privilege('authenticated','public.unlock_chapter_with_coins(uuid,uuid,integer,integer)','execute'), 'client can debit directly';
 assert not has_table_privilege('authenticated','public.chapter_coin_unlocks','insert'), 'client can grant unlocks';
end $$;
-- A downstream ledger failure must roll back wallet debit and permanent ownership.
create function reject_test_ledger() returns trigger language plpgsql as $$ begin raise exception 'TEST_LEDGER_FAILURE'; end $$;
create trigger reject_test_ledger before insert on coin_transactions for each row execute function reject_test_ledger();
do $$ begin
 begin
  perform unlock_chapter_with_coins('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000005',5);
 exception when raise_exception then if sqlerrm <> 'TEST_LEDGER_FAILURE' then raise; end if; end;
 assert (select balance from coin_wallets where user_id='00000000-0000-4000-8000-000000000001')=5, 'debit survived rollback';
 assert not exists(select 1 from chapter_coin_unlocks where chapter_id='20000000-0000-4000-8000-000000000005'), 'unlock survived rollback';
end $$;
drop trigger reject_test_ledger on coin_transactions;
set role authenticated;
do $$ begin assert (select count(*) from chapters)=0, 'direct read leaks premium story content'; end $$;
reset role;
select 'Coin unlock transaction assertions passed' as result;
