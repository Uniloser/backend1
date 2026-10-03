-- Run after story_ads.sql and wallet_rewards.sql.
-- Promotion purchase and gem debit are committed as one database transaction.

alter table public.story_ads
  add column if not exists gem_cost integer check (gem_cost is null or gem_cost >= 0),
  add column if not exists request_key uuid;

create unique index if not exists story_ads_author_request_key_unique
  on public.story_ads (author_id, request_key)
  where request_key is not null;

create or replace function public.create_story_promotion_with_gems(
  p_user_id uuid,
  p_story_id uuid,
  p_promotion_type text,
  p_duration_days integer,
  p_request_key uuid
)
returns public.story_ads
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_story public.stories;
  created_ad public.story_ads;
  current_balance bigint;
  gem_price integer;
begin
  if p_request_key is null then
    raise exception using errcode = '22023', message = 'A request key is required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_request_key::text, 0));

  select * into created_ad
  from public.story_ads
  where author_id = p_user_id and request_key = p_request_key;
  if found then
    return created_ad;
  end if;

  gem_price := case p_duration_days
    when 1 then 5
    when 3 then 10
    when 7 then 20
    when 14 then 40
    else null
  end;
  if gem_price is null then
    raise exception using errcode = '22023', message = 'Choose a valid promotion package.';
  end if;
  if p_promotion_type not in ('boost', 'featured', 'reward') then
    raise exception using errcode = '22023', message = 'Choose a valid promotion type.';
  end if;

  select * into selected_story
  from public.stories
  where id = p_story_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Story not found.';
  end if;
  if selected_story.author_id <> p_user_id then
    raise exception using errcode = '42501', message = 'You can only promote your own story.';
  end if;
  if selected_story.status <> 'published' or selected_story.cover_url is null then
    raise exception using errcode = '22023', message = 'Promotions require a published story with a cover image.';
  end if;

  insert into public.gem_wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select balance into current_balance
  from public.gem_wallets
  where user_id = p_user_id
  for update;
  if current_balance < gem_price then
    raise exception using errcode = 'P0001', message = 'Insufficient Gems.';
  end if;

  update public.gem_wallets
  set balance = balance - gem_price, updated_at = now()
  where user_id = p_user_id;

  insert into public.story_ads (
    author_id, story_id, title, description, image_url, button_text,
    promotion_type, status, budget, spent, starts_at, ends_at, is_active,
    gem_cost, request_key
  )
  values (
    p_user_id, selected_story.id, selected_story.title,
    coalesce(selected_story.description, ''), selected_story.cover_url,
    'Read Story', p_promotion_type, 'active', 0, 0, now(),
    now() + make_interval(days => p_duration_days), true, gem_price, p_request_key
  )
  returning * into created_ad;

  insert into public.gem_transactions (
    user_id, amount, reason, reference_id, idempotency_key, metadata
  )
  values (
    p_user_id, -gem_price, 'story_promotion', created_ad.id::text,
    'story_promotion:' || created_ad.id::text,
    jsonb_build_object(
      'story_id', selected_story.id,
      'promotion_type', p_promotion_type,
      'duration_days', p_duration_days
    )
  );

  return created_ad;
end;
$$;

revoke all on function public.create_story_promotion_with_gems(uuid, uuid, text, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.create_story_promotion_with_gems(uuid, uuid, text, integer, uuid)
  to service_role;
