-- Apply after discovery.sql, readagora_premium_access.sql and readagora_creator_economy.sql.
begin;
alter table public.chapters add column if not exists coin_price integer not null default 5 check (coin_price > 0);
create table if not exists public.chapter_coin_unlocks (
  user_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  coins_spent integer not null check (coins_spent > 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);
alter table public.chapter_coin_unlocks enable row level security;
revoke all on public.chapter_coin_unlocks from public, anon, authenticated;
grant all on public.chapter_coin_unlocks to service_role;
alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions add constraint coin_transactions_type_check
  check (type in ('PURCHASE','SUPPORT_SENT','CHAPTER_UNLOCK','REFUND','ADMIN_GRANT','BONUS','REVERSAL'));

create or replace function public.unlock_chapter_with_coins(
  p_user_id uuid, p_chapter_id uuid, p_expected_price integer, p_minimum_free integer default 3
) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.chapters; s public.stories; w public.coin_wallets; chapter_index integer;
begin
  -- Lock metadata before quoting/charging; never accept a client-supplied debit amount.
  select * into c from public.chapters where id = p_chapter_id for update;
  if not found then raise exception 'CHAPTER_NOT_FOUND'; end if;
  select * into s from public.stories where id = c.story_id for share;
  if c.status <> 'published' or not public.discovery_can_read_story(c.story_id, p_user_id) then
    raise exception 'CHAPTER_NOT_FOUND';
  end if;
  select count(*) into chapter_index from public.chapters
    where story_id = c.story_id and status = 'published' and chapter_order < c.chapter_order;
  if s.author_id = p_user_id or s.access_type is distinct from 'PREMIUM' or s.monetization_enabled is distinct from true
    or chapter_index < greatest(3, p_minimum_free, coalesce(s.free_chapter_count, 3)) then
    return jsonb_build_object('accessible',true,'charged',0,'reason','FREE');
  end if;
  if exists(select 1 from public.subscriptions where user_id = p_user_id and status in ('ACTIVE','GRACE_PERIOD')
    and (current_period_end is null or current_period_end > now())) then
    return jsonb_build_object('accessible',true,'charged',0,'reason','PREMIUM');
  end if;
  -- Serializes concurrent spending across different chapters on the same wallet.
  insert into public.coin_wallets(user_id) values(p_user_id) on conflict do nothing;
  select * into w from public.coin_wallets where user_id = p_user_id for update;
  if exists(select 1 from public.chapter_coin_unlocks where user_id = p_user_id and chapter_id = p_chapter_id) then
    return jsonb_build_object('accessible',true,'charged',0,'reason','COIN_UNLOCK','balance',w.balance);
  end if;
  if p_expected_price is distinct from c.coin_price then raise exception 'COIN_PRICE_CHANGED'; end if;
  if w.balance < c.coin_price then raise exception 'INSUFFICIENT_COINS'; end if;
  update public.coin_wallets set balance = balance - c.coin_price,
    lifetime_spent = lifetime_spent + c.coin_price, updated_at = now()
    where user_id = p_user_id returning * into w;
  insert into public.chapter_coin_unlocks(user_id,chapter_id,coins_spent) values(p_user_id,p_chapter_id,c.coin_price);
  insert into public.coin_transactions(user_id,type,amount,balance_after,source_id,metadata)
    values(p_user_id,'CHAPTER_UNLOCK',-c.coin_price,w.balance,p_chapter_id::text,jsonb_build_object('chapter_id',p_chapter_id,'story_id',c.story_id));
  return jsonb_build_object('accessible',true,'charged',c.coin_price,'reason','COIN_UNLOCK','balance',w.balance);
end;
$$;
revoke all on function public.unlock_chapter_with_coins(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.unlock_chapter_with_coins(uuid,uuid,integer,integer) to service_role;

-- Restrictive policies also cover pre-existing permissive chapter/panel SELECT policies.
-- Premium bodies are served through the backend, which checks subscriptions and unlocks.
create or replace function public.chapter_direct_read_allowed(p_chapter uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.chapters c join public.stories s on s.id=c.story_id
    where c.id=p_chapter and (s.author_id=auth.uid() or
      (s.access_type is distinct from 'PREMIUM' or s.monetization_enabled is distinct from true)));
$$;
revoke all on function public.chapter_direct_read_allowed(uuid) from public;
grant execute on function public.chapter_direct_read_allowed(uuid) to anon,authenticated,service_role;
drop policy if exists chapter_premium_backend_only on public.chapters;
create policy chapter_premium_backend_only on public.chapters as restrictive for select to anon,authenticated
  using(public.chapter_direct_read_allowed(id));
drop policy if exists panel_premium_backend_only on public.comic_panels;
create policy panel_premium_backend_only on public.comic_panels as restrictive for select to anon,authenticated
  using(public.chapter_direct_read_allowed(chapter_id));
drop policy if exists speech_premium_backend_only on public.speech_bubbles;
create policy speech_premium_backend_only on public.speech_bubbles as restrictive for select to anon,authenticated
  using(exists(select 1 from public.comic_panels p where p.id=panel_id and public.chapter_direct_read_allowed(p.chapter_id)));
commit;
