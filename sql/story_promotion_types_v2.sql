-- Promotion behavior and review workflow.
-- Apply after wallet_rewards.sql, discovery.sql, story_ads.sql, and
-- story_promotions_gems.sql. Featured submissions are reviewed by ADMIN;
-- reward promotions distribute their spent Gems to verified chapter readers.
begin;

alter table public.story_ads
  add column if not exists duration_days integer not null default 1 check (duration_days in (1, 3, 7, 14)),
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reward_gems_total integer not null default 0 check (reward_gems_total >= 0),
  add column if not exists reward_gems_remaining integer not null default 0 check (reward_gems_remaining >= 0 and reward_gems_remaining <= reward_gems_total);

alter table public.story_ads drop constraint if exists story_ads_status_check;
alter table public.story_ads add constraint story_ads_status_check
  check (status in ('draft', 'active', 'paused', 'completed', 'pending_review', 'rejected'));

update public.story_ads set duration_days = case gem_cost
  when 5 then 1 when 10 then 3 when 20 then 7 when 40 then 14 else duration_days end
where gem_cost in (5, 10, 20, 40);

-- Route currently running creator-paid Featured placements through review.
update public.story_ads set status = 'pending_review', is_active = false,
  starts_at = now(), ends_at = null
where promotion_type = 'featured' and gem_cost is not null and status = 'active'
  and is_active and ends_at >= now();

-- The old Reader Reward label had no reward pool. Close and refund unexpired
-- creator campaigns so nobody pays for an inactive reward promise.
do $$
declare legacy_reward record;
begin
  for legacy_reward in select id, author_id, gem_cost from public.story_ads
    where promotion_type = 'reward' and status = 'active' and is_active
      and gem_cost > 0 and reward_gems_total = 0 and ends_at >= now()
    for update
  loop
    insert into public.gem_wallets(user_id) values (legacy_reward.author_id) on conflict (user_id) do nothing;
    update public.gem_wallets set balance = balance + legacy_reward.gem_cost, updated_at = now()
      where user_id = legacy_reward.author_id;
    insert into public.gem_transactions(user_id, amount, reason, reference_id, idempotency_key, metadata)
      values (legacy_reward.author_id, legacy_reward.gem_cost, 'legacy_reader_reward_refund', legacy_reward.id::text,
        'legacy_reader_reward_refund:' || legacy_reward.id::text,
        jsonb_build_object('promotion_id', legacy_reward.id, 'reason', 'Reader Reward mechanics were not available before this rollout.'));
    update public.story_ads set status = 'completed', is_active = false,
      review_note = 'Closed during the Reader Reward rollout; campaign Gems were refunded.'
      where id = legacy_reward.id;
  end loop;
end;
$$;

create table if not exists public.story_promotion_reward_claims (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.story_ads(id) on delete cascade,
  reader_id uuid not null references public.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  gems_awarded integer not null default 1 check (gems_awarded > 0),
  created_at timestamptz not null default now(),
  unique(promotion_id, reader_id)
);
create index if not exists story_promotion_reward_claims_reader_idx on public.story_promotion_reward_claims(reader_id, created_at desc);
alter table public.story_promotion_reward_claims enable row level security;
revoke all on public.story_promotion_reward_claims from anon, authenticated;
grant all on public.story_promotion_reward_claims to service_role;

create or replace function public.create_story_promotion_with_gems(
  p_user_id uuid, p_story_id uuid, p_promotion_type text, p_duration_days integer, p_request_key uuid
) returns public.story_ads language plpgsql security definer set search_path = public as $$
declare
  selected_story public.stories;
  created_ad public.story_ads;
  current_balance bigint;
  gem_price integer;
  campaign_status text;
  reward_pool integer := 0;
begin
  if p_request_key is null then raise exception using errcode = '22023', message = 'A request key is required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_request_key::text, 0));
  select * into created_ad from public.story_ads where author_id = p_user_id and request_key = p_request_key;
  if found then return created_ad; end if;

  gem_price := case p_duration_days when 1 then 5 when 3 then 10 when 7 then 20 when 14 then 40 else null end;
  if gem_price is null then raise exception using errcode = '22023', message = 'Choose a valid promotion package.'; end if;
  if p_promotion_type not in ('boost', 'featured', 'reward') then raise exception using errcode = '22023', message = 'Choose a valid promotion type.'; end if;
  select * into selected_story from public.stories where id = p_story_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Story not found.'; end if;
  if selected_story.author_id <> p_user_id then raise exception using errcode = '42501', message = 'You can only promote your own story.'; end if;
  if selected_story.status <> 'published' or nullif(trim(selected_story.cover_url), '') is null
    or nullif(trim(selected_story.description), '') is null
    or coalesce(selected_story.moderation_status, 'approved') <> 'approved' then
    raise exception using errcode = '22023', message = 'Promotions require an approved published story with a cover and description.';
  end if;
  if not exists(select 1 from public.chapters where story_id = p_story_id and status = 'published') then
    raise exception using errcode = '22023', message = 'Publish at least one chapter before promoting this story.';
  end if;

  insert into public.gem_wallets(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance into current_balance from public.gem_wallets where user_id = p_user_id for update;
  if current_balance < gem_price then raise exception using errcode = 'P0001', message = 'Insufficient Gems.'; end if;
  update public.gem_wallets set balance = balance - gem_price, updated_at = now() where user_id = p_user_id;

  campaign_status := case when p_promotion_type = 'featured' then 'pending_review' else 'active' end;
  if p_promotion_type = 'reward' then reward_pool := gem_price; end if;
  insert into public.story_ads (
    author_id, story_id, title, description, image_url, button_text, promotion_type,
    status, budget, spent, starts_at, ends_at, is_active, gem_cost, request_key,
    duration_days, reward_gems_total, reward_gems_remaining
  ) values (
    p_user_id, selected_story.id, selected_story.title, selected_story.description,
    selected_story.cover_url, 'Read Story', p_promotion_type, campaign_status, 0, 0, now(),
    case when campaign_status = 'active' then now() + make_interval(days => p_duration_days) else null end,
    campaign_status = 'active', gem_price, p_request_key, p_duration_days, reward_pool, reward_pool
  ) returning * into created_ad;
  insert into public.gem_transactions(user_id, amount, reason, reference_id, idempotency_key, metadata)
  values (p_user_id, -gem_price, 'story_promotion', created_ad.id::text,
    'story_promotion:' || created_ad.id::text,
    jsonb_build_object('story_id', selected_story.id, 'promotion_type', p_promotion_type,
      'duration_days', p_duration_days, 'reward_gems_total', reward_pool));
  return created_ad;
end;
$$;
revoke all on function public.create_story_promotion_with_gems(uuid, uuid, text, integer, uuid) from public, anon, authenticated;
grant execute on function public.create_story_promotion_with_gems(uuid, uuid, text, integer, uuid) to service_role;

-- ADMIN approves a pending Featured placement or declines and refunds it.
create or replace function public.review_story_promotion(p_promotion_id uuid, p_approved boolean, p_review_note text default null)
returns public.story_ads language plpgsql security definer set search_path = public as $$
declare campaign public.story_ads;
begin
  select * into campaign from public.story_ads where id = p_promotion_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Promotion not found.'; end if;
  if campaign.promotion_type <> 'featured' or campaign.status <> 'pending_review' then
    raise exception using errcode = '22023', message = 'Only pending Featured submissions can be reviewed.';
  end if;
  if p_approved then
    if not exists(select 1 from public.stories s where s.id = campaign.story_id
      and s.status = 'published' and s.moderation_status = 'approved'
      and nullif(trim(s.cover_url), '') is not null and nullif(trim(s.description), '') is not null
      and exists(select 1 from public.chapters c where c.story_id = s.id and c.status = 'published')) then
      raise exception using errcode = '22023', message = 'The story no longer meets Featured eligibility requirements.';
    end if;
    update public.story_ads set status = 'active', is_active = true, reviewed_at = now(),
      review_note = nullif(left(trim(coalesce(p_review_note, '')), 500), ''), starts_at = now(),
      ends_at = now() + make_interval(days => duration_days), priority = greatest(priority, 100)
      where id = p_promotion_id returning * into campaign;
  else
    insert into public.gem_wallets(user_id) values (campaign.author_id) on conflict (user_id) do nothing;
    update public.gem_wallets set balance = balance + campaign.gem_cost, updated_at = now() where user_id = campaign.author_id;
    insert into public.gem_transactions(user_id, amount, reason, reference_id, idempotency_key, metadata)
      values (campaign.author_id, campaign.gem_cost, 'featured_promotion_refund', campaign.id::text,
        'featured_promotion_refund:' || campaign.id::text,
        jsonb_build_object('promotion_id', campaign.id, 'review_note', left(trim(coalesce(p_review_note, '')), 500)));
    update public.story_ads set status = 'rejected', is_active = false, reviewed_at = now(),
      review_note = nullif(left(trim(coalesce(p_review_note, '')), 500), '')
      where id = p_promotion_id returning * into campaign;
  end if;
  return campaign;
end;
$$;
revoke all on function public.review_story_promotion(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.review_story_promotion(uuid, boolean, text) to service_role;

create or replace function public.story_promotion_stats(p_author_id uuid)
returns table(promotion_id uuid, impressions bigint, clicks bigint, rewards_awarded bigint)
language sql stable security definer set search_path = public as $$
  select a.id,
    count(e.id) filter (where e.event_type = 'impression'),
    count(e.id) filter (where e.event_type = 'click'),
    (select count(*) from public.story_promotion_reward_claims c where c.promotion_id = a.id)
  from public.story_ads a
  left join public.story_ad_events e on e.ad_id = a.id
  where a.author_id = p_author_id
  group by a.id;
$$;
revoke all on function public.story_promotion_stats(uuid) from public, anon, authenticated;
grant execute on function public.story_promotion_stats(uuid) to service_role;

-- Award one Gem after the server records a completed chapter. The campaign's
-- spent Gems cap the total awards; a reader can earn once per campaign.
create or replace function public.award_story_promotion_reader_reward()
returns trigger language plpgsql security definer set search_path = public as $$
declare campaign public.story_ads; claim_id uuid;
begin
  if new.event_type <> 'chapter_read' or new.user_id is null then return new; end if;
  for campaign in select a.* from public.story_ads a
    where a.story_id = new.story_id and a.promotion_type = 'reward'
      and a.status = 'active' and a.is_active and a.starts_at <= now() and a.ends_at >= now()
      and a.reward_gems_remaining > 0 and a.author_id <> new.user_id
    order by a.created_at for update
  loop
    insert into public.story_promotion_reward_claims(promotion_id, reader_id, chapter_id, gems_awarded)
      values(campaign.id, new.user_id, new.chapter_id, 1)
      on conflict (promotion_id, reader_id) do nothing returning id into claim_id;
    if claim_id is null then continue; end if;
    update public.story_ads set reward_gems_remaining = reward_gems_remaining - 1,
      status = case when reward_gems_remaining <= 1 then 'completed' else status end,
      is_active = case when reward_gems_remaining <= 1 then false else is_active end where id = campaign.id;
    insert into public.gem_wallets(user_id) values(new.user_id) on conflict (user_id) do nothing;
    update public.gem_wallets set balance = balance + 1, updated_at = now() where user_id = new.user_id;
    insert into public.gem_transactions(user_id, amount, reason, reference_id, idempotency_key, metadata)
      values(new.user_id, 1, 'story_reader_reward', campaign.id::text,
        'story_reader_reward:' || campaign.id::text || ':' || new.user_id::text,
        jsonb_build_object('promotion_id', campaign.id, 'story_id', new.story_id, 'chapter_id', new.chapter_id));
    claim_id := null;
  end loop;
  return new;
end;
$$;
revoke all on function public.award_story_promotion_reader_reward() from public, anon, authenticated;
drop trigger if exists story_promotion_reader_reward on public.user_events;
create trigger story_promotion_reader_reward after insert on public.user_events
  for each row execute function public.award_story_promotion_reader_reward();

commit;
