-- Manual creator payout workflow for the purchase-backed cash ledger.
-- Apply after readagora_coin_cash_economy.sql. No payout provider is integrated:
-- transfers remain manual and payout_processing_enabled stays false by default.
begin;

alter table public.creator_payout_requests
  add column if not exists reserve_state text not null default 'NOT_ALLOCATED'
    check (reserve_state in ('NOT_ALLOCATED', 'AWAITING_RESERVE', 'HELD', 'RELEASED', 'PAID')),
  add column if not exists payment_outcome text not null default 'NOT_STARTED'
    check (payment_outcome in ('NOT_STARTED', 'IN_PROGRESS', 'UNCERTAIN', 'CONFIRMED', 'FAILED')),
  add column if not exists destination_hint text not null default '',
  add column if not exists reviewed_by uuid references public.users(id),
  add column if not exists review_note text,
  add column if not exists failed_by uuid references public.users(id),
  add column if not exists failure_note text,
  add column if not exists reconciled_by uuid references public.users(id),
  add column if not exists updated_at timestamptz not null default now();
alter table public.creator_payout_requests drop constraint if exists creator_payout_requests_payout_method_check;
alter table public.creator_payout_requests add constraint creator_payout_requests_payout_method_check
  check (payout_method in ('BANK', 'MOBILE_MONEY', 'MTN_MOBILE_MONEY', 'AIRTEL_MOBILE_MONEY'));

create table if not exists public.creator_payout_reserve (
  singleton boolean primary key default true check (singleton),
  currency char(3) not null default 'ZMW' check (currency = 'ZMW'),
  monthly_target_minor_units bigint not null default 200000 check (monthly_target_minor_units >= 0),
  available_minor_units bigint not null default 0 check (available_minor_units >= 0),
  held_minor_units bigint not null default 0 check (held_minor_units >= 0),
  updated_at timestamptz not null default now()
);
insert into public.creator_payout_reserve(singleton) values (true) on conflict (singleton) do nothing;

create table if not exists public.creator_payout_reserve_movements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('FUND', 'PAYOUT_HELD', 'PAYOUT_RELEASED', 'PAYOUT_PAID')),
  amount_zmw_minor_units bigint not null check (amount_zmw_minor_units > 0),
  available_delta_minor_units bigint not null,
  held_delta_minor_units bigint not null,
  payout_request_id uuid references public.creator_payout_requests(id),
  idempotency_key uuid not null unique,
  reference text,
  note text not null default '',
  actor_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  check (
    (kind = 'FUND' and available_delta_minor_units = amount_zmw_minor_units and held_delta_minor_units = 0 and payout_request_id is null)
    or (kind = 'PAYOUT_HELD' and available_delta_minor_units = -amount_zmw_minor_units and held_delta_minor_units = amount_zmw_minor_units and payout_request_id is not null)
    or (kind = 'PAYOUT_RELEASED' and available_delta_minor_units = amount_zmw_minor_units and held_delta_minor_units = -amount_zmw_minor_units and payout_request_id is not null)
    or (kind = 'PAYOUT_PAID' and available_delta_minor_units = 0 and held_delta_minor_units = -amount_zmw_minor_units and payout_request_id is not null)
  )
);
create unique index if not exists creator_payout_reserve_payout_kind_idx
  on public.creator_payout_reserve_movements(payout_request_id, kind)
  where payout_request_id is not null;
create index if not exists creator_payout_reserve_movements_created_idx
  on public.creator_payout_reserve_movements(created_at desc);

create table if not exists public.creator_payout_audit (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid not null references public.creator_payout_requests(id),
  actor_id uuid not null references public.users(id),
  action text not null check (action in (
    'REQUESTED', 'APPROVED', 'APPROVED_AWAITING_RESERVE', 'RESERVE_ALLOCATED',
    'REJECTED', 'TRANSFER_STARTED', 'PAYMENT_UNCERTAIN', 'PAID', 'FAILED'
  )),
  previous_status text,
  new_status text not null,
  note text not null default '',
  provider_reference text,
  created_at timestamptz not null default now()
);
create index if not exists creator_payout_audit_request_created_idx
  on public.creator_payout_audit(payout_request_id, created_at);

alter table public.creator_cash_journals drop constraint if exists creator_cash_journals_kind_check;
alter table public.creator_cash_journals add constraint creator_cash_journals_kind_check
  check (kind in ('CHAPTER_UNLOCK', 'AUTHOR_TIP', 'PURCHASE_REFUND', 'PAYOUT_RESERVE', 'PAYOUT_RELEASE', 'PAYOUT_PAID', 'ADJUSTMENT'));
alter table public.creator_cash_ledger_entries drop constraint if exists creator_cash_ledger_entries_account_code_check;
alter table public.creator_cash_ledger_entries add constraint creator_cash_ledger_entries_account_code_check
  check (account_code in (
    'UNSPENT_COIN_REVENUE', 'CREATOR_PENDING', 'CREATOR_AVAILABLE',
    'CREATOR_RESERVED', 'CREATOR_PAID', 'PLATFORM_REVENUE',
    'REFUND_RESERVE', 'PLATFORM_FEE'
  ));

create or replace function public.write_creator_payout_journal(
  p_kind text, p_source_id text, p_writer_id uuid, p_amount_usd_cents bigint, p_metadata jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare journal_id uuid;
begin
  if p_amount_usd_cents <= 0 then raise exception 'INVALID_PAYOUT_JOURNAL_AMOUNT'; end if;
  insert into public.creator_cash_journals(
    kind, source_id, writer_id, eligible_net_usd_cents, creator_share_bps,
    creator_usd_cents, platform_usd_cents, metadata
  ) values (p_kind, p_source_id, p_writer_id, p_amount_usd_cents, 10000, p_amount_usd_cents, 0, p_metadata)
  returning id into journal_id;

  if p_kind = 'PAYOUT_RESERVE' then
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, debit_usd_cents)
      values (journal_id, 'CREATOR_AVAILABLE', p_writer_id, p_amount_usd_cents);
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, credit_usd_cents)
      values (journal_id, 'CREATOR_RESERVED', p_writer_id, p_amount_usd_cents);
  elsif p_kind = 'PAYOUT_RELEASE' then
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, debit_usd_cents)
      values (journal_id, 'CREATOR_RESERVED', p_writer_id, p_amount_usd_cents);
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, credit_usd_cents)
      values (journal_id, 'CREATOR_AVAILABLE', p_writer_id, p_amount_usd_cents);
  elsif p_kind = 'PAYOUT_PAID' then
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, debit_usd_cents)
      values (journal_id, 'CREATOR_RESERVED', p_writer_id, p_amount_usd_cents);
    insert into public.creator_cash_ledger_entries(journal_id, account_code, user_id, credit_usd_cents)
      values (journal_id, 'CREATOR_PAID', p_writer_id, p_amount_usd_cents);
  else
    raise exception 'INVALID_PAYOUT_JOURNAL_KIND';
  end if;
  return journal_id;
end; $$;
revoke all on function public.write_creator_payout_journal(text, text, uuid, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.write_creator_payout_journal(text, text, uuid, bigint, jsonb) to service_role;

create or replace function public.request_creator_payout(
  p_writer_id uuid, p_amount_zmw_minor_units bigint, p_payout_method text,
  p_destination_reference text, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  policy public.creator_cashout_policy;
  account public.creator_cash_accounts;
  payout public.creator_payout_requests;
  amount_usd bigint;
  masked_hint text;
  old_request public.creator_payout_requests;
begin
  if p_idempotency_key is null then raise exception 'PAYOUT_IDEMPOTENCY_KEY_REQUIRED'; end if;
  if p_amount_zmw_minor_units is null or p_amount_zmw_minor_units <= 0 then raise exception 'INVALID_PAYOUT_AMOUNT'; end if;
  if nullif(trim(p_destination_reference), '') is null
    or length(trim(p_destination_reference)) < 8
    or length(trim(p_destination_reference)) > 60
    or trim(p_destination_reference) !~ '^[A-Za-z0-9+ ().-]+$' then
    raise exception 'INVALID_PAYOUT_DESTINATION';
  end if;

  insert into public.creator_cash_accounts(writer_id) values (p_writer_id) on conflict (writer_id) do nothing;
  select * into account from public.creator_cash_accounts where writer_id = p_writer_id for update;
  select * into old_request from public.creator_payout_requests
    where writer_id = p_writer_id and idempotency_key = p_idempotency_key;
  if found then
    if old_request.amount_zmw_minor_units <> p_amount_zmw_minor_units
      or old_request.payout_method <> p_payout_method
      or old_request.destination_reference <> trim(p_destination_reference) then
      raise exception 'PAYOUT_IDEMPOTENCY_MISMATCH';
    end if;
    return jsonb_build_object('id', old_request.id, 'status', old_request.status,
      'reserveState', old_request.reserve_state, 'paymentOutcome', old_request.payment_outcome,
      'amountZmwMinorUnits', old_request.amount_zmw_minor_units,
      'destinationHint', old_request.destination_hint, 'duplicate', true);
  end if;

  select * into policy from public.creator_cashout_policy where singleton for share;
  if not found or not policy.enabled or not policy.payout_processing_enabled
    or policy.provider_name is null or policy.fx_usd_zmw_micros is null
    or cardinality(policy.supported_methods) = 0 or policy.fee_bps <> 0 then
    raise exception 'PAYOUTS_DISABLED';
  end if;
  if p_amount_zmw_minor_units < policy.minimum_minor_units then raise exception 'PAYOUT_BELOW_MINIMUM'; end if;
  if not (p_payout_method = any(policy.supported_methods)) then raise exception 'PAYOUT_METHOD_UNAVAILABLE'; end if;
  if policy.fx_usd_zmw_micros <= 0 then raise exception 'PAYOUT_FX_UNAVAILABLE'; end if;

  amount_usd := ceil(p_amount_zmw_minor_units::numeric * 1000000 / policy.fx_usd_zmw_micros)::bigint;
  if amount_usd <= 0 or account.available_usd_cents < amount_usd then raise exception 'INSUFFICIENT_AVAILABLE_EARNINGS'; end if;
  update public.creator_cash_accounts set
    available_usd_cents = available_usd_cents - amount_usd,
    reserved_usd_cents = reserved_usd_cents + amount_usd,
    updated_at = now()
  where writer_id = p_writer_id and available_usd_cents >= amount_usd;
  if not found then raise exception 'INSUFFICIENT_AVAILABLE_EARNINGS'; end if;

  masked_hint := repeat('*', greatest(0, length(trim(p_destination_reference)) - 4)) || right(trim(p_destination_reference), 4);
  insert into public.creator_payout_requests(
    writer_id, amount_usd_cents, amount_zmw_minor_units, fee_zmw_minor_units,
    exchange_rate_usd_zmw_micros, payout_method, destination_reference, destination_hint,
    idempotency_key, status, reserve_state, payment_outcome
  ) values (
    p_writer_id, amount_usd, p_amount_zmw_minor_units, 0,
    policy.fx_usd_zmw_micros, p_payout_method, trim(p_destination_reference), masked_hint,
    p_idempotency_key, 'REQUESTED', 'NOT_ALLOCATED', 'NOT_STARTED'
  ) returning * into payout;

  perform public.write_creator_payout_journal(
    'PAYOUT_RESERVE', payout.id::text, p_writer_id, amount_usd,
    jsonb_build_object('payout_request_id', payout.id, 'amount_zmw_minor_units', p_amount_zmw_minor_units)
  );
  insert into public.creator_payout_audit(payout_request_id, actor_id, action, new_status, note)
    values (payout.id, p_writer_id, 'REQUESTED', payout.status, 'Creator submitted payout request.');
  return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state,
    'paymentOutcome', payout.payment_outcome, 'amountZmwMinorUnits', payout.amount_zmw_minor_units,
    'destinationHint', payout.destination_hint, 'duplicate', false);
end; $$;
revoke all on function public.request_creator_payout(uuid, bigint, text, text, uuid) from public, anon, authenticated;
grant execute on function public.request_creator_payout(uuid, bigint, text, text, uuid) to service_role;

create or replace function public.get_creator_cashout_quote(p_writer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare policy public.creator_cashout_policy; account public.creator_cash_accounts;
begin
  select * into policy from public.creator_cashout_policy where singleton;
  select * into account from public.creator_cash_accounts where writer_id = p_writer_id;
  return jsonb_build_object(
    'enabled', policy.enabled and policy.payout_processing_enabled
      and policy.provider_name is not null and policy.fx_usd_zmw_micros is not null
      and cardinality(policy.supported_methods) > 0 and policy.fee_bps = 0,
    'currency', policy.currency,
    'minimumMinorUnits', policy.minimum_minor_units,
    'cadence', policy.payout_cadence,
    'processingTarget', policy.processing_target,
    'feeBps', policy.fee_bps,
    'feePayer', policy.fee_payer,
    'exchangeRateUsdZmwMicros', policy.fx_usd_zmw_micros,
    'exchangeRateObservedAt', policy.fx_observed_at,
    'supportedMethods', policy.supported_methods,
    'availableUsdCents', coalesce(account.available_usd_cents, 0),
    'reason', case
      when not policy.enabled then 'PAYOUTS_DISABLED_PENDING_PROVIDER_AND_POLICY_VERIFICATION'
      when not policy.payout_processing_enabled then 'PAYOUT_PROCESSING_NOT_IMPLEMENTED'
      when policy.provider_name is null then 'PAYOUT_PROVIDER_NOT_CONFIGURED'
      when policy.fx_usd_zmw_micros is null then 'EXCHANGE_RATE_NOT_CONFIGURED'
      when cardinality(policy.supported_methods) = 0 then 'PAYOUT_METHODS_NOT_CONFIGURED'
      when policy.fee_bps <> 0 then 'PAYOUT_FEES_NOT_CONFIGURED'
      else null
    end
  );
end; $$;
revoke all on function public.get_creator_cashout_quote(uuid) from public, anon, authenticated;
grant execute on function public.get_creator_cashout_quote(uuid) to service_role;

create or replace function public.review_creator_payout(
  p_payout_request_id uuid, p_actor_id uuid, p_decision text, p_note text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare payout public.creator_payout_requests; reserve public.creator_payout_reserve; was_awaiting_reserve boolean := false;
begin
  if p_decision not in ('approve', 'reject') then raise exception 'INVALID_PAYOUT_DECISION'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 or length(trim(p_note)) > 1000 then raise exception 'PAYOUT_REVIEW_NOTE_REQUIRED'; end if;
  select * into payout from public.creator_payout_requests where id = p_payout_request_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if payout.writer_id = p_actor_id then raise exception 'PAYOUT_SELF_APPROVAL_FORBIDDEN'; end if;

  if p_decision = 'reject' then
    if not (payout.status = 'REQUESTED'
      or (payout.status = 'APPROVED' and payout.reserve_state = 'AWAITING_RESERVE')) then
      raise exception 'PAYOUT_NOT_REVIEWABLE';
    end if;
    if payout.payment_outcome <> 'NOT_STARTED' then raise exception 'PAYOUT_NOT_REVIEWABLE'; end if;
    update public.creator_cash_accounts set
      available_usd_cents = available_usd_cents + payout.amount_usd_cents,
      reserved_usd_cents = reserved_usd_cents - payout.amount_usd_cents,
      updated_at = now()
    where writer_id = payout.writer_id and reserved_usd_cents >= payout.amount_usd_cents;
    if not found then raise exception 'PAYOUT_ACCOUNT_RESERVATION_MISMATCH'; end if;
    update public.creator_payout_requests set status = 'REJECTED', reserve_state = 'RELEASED',
      reviewed_by = p_actor_id, review_note = trim(p_note), updated_at = now()
      where id = payout.id returning * into payout;
    perform public.write_creator_payout_journal(
      'PAYOUT_RELEASE', payout.id::text || ':rejected', payout.writer_id, payout.amount_usd_cents,
      jsonb_build_object('payout_request_id', payout.id, 'reason', trim(p_note))
    );
    insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
      values (payout.id, p_actor_id, 'REJECTED', 'REQUESTED', payout.status, trim(p_note));
    return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state);
  end if;

  if payout.status = 'REQUESTED' then
    update public.creator_payout_requests set reviewed_by = p_actor_id, review_note = trim(p_note), updated_at = now()
      where id = payout.id returning * into payout;
  elsif payout.status <> 'APPROVED' or payout.reserve_state <> 'AWAITING_RESERVE' then
    raise exception 'PAYOUT_NOT_REVIEWABLE';
  else
    was_awaiting_reserve := true;
  end if;

  select * into reserve from public.creator_payout_reserve where singleton for update;
  if reserve.available_minor_units < payout.amount_zmw_minor_units then
    update public.creator_payout_requests set status = 'APPROVED', reserve_state = 'AWAITING_RESERVE',
      approved_at = coalesce(approved_at, now()), updated_at = now()
      where id = payout.id returning * into payout;
    insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
      values (payout.id, p_actor_id, 'APPROVED_AWAITING_RESERVE', 'REQUESTED', payout.status, trim(p_note));
    return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state,
      'reason', 'PAYOUT_RESERVE_INSUFFICIENT');
  end if;

  update public.creator_payout_reserve set
    available_minor_units = available_minor_units - payout.amount_zmw_minor_units,
    held_minor_units = held_minor_units + payout.amount_zmw_minor_units,
    updated_at = now()
  where singleton and available_minor_units >= payout.amount_zmw_minor_units;
  if not found then raise exception 'PAYOUT_RESERVE_INSUFFICIENT'; end if;
  insert into public.creator_payout_reserve_movements(
    kind, amount_zmw_minor_units, available_delta_minor_units, held_delta_minor_units,
    payout_request_id, idempotency_key, note, actor_id
  ) values (
    'PAYOUT_HELD', payout.amount_zmw_minor_units, -payout.amount_zmw_minor_units,
    payout.amount_zmw_minor_units, payout.id, gen_random_uuid(), trim(p_note), p_actor_id
  );
  update public.creator_payout_requests set status = 'APPROVED', reserve_state = 'HELD',
    approved_at = coalesce(approved_at, now()), updated_at = now()
    where id = payout.id returning * into payout;
  insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
    values (payout.id, p_actor_id,
      case when was_awaiting_reserve then 'RESERVE_ALLOCATED' else 'APPROVED' end,
      'APPROVED', payout.status, trim(p_note));
  return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state);
end; $$;
revoke all on function public.review_creator_payout(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_creator_payout(uuid, uuid, text, text) to service_role;

create or replace function public.fund_creator_payout_reserve(
  p_actor_id uuid, p_amount_zmw_minor_units bigint, p_reference text, p_note text, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare reserve public.creator_payout_reserve; prior public.creator_payout_reserve_movements;
begin
  if p_amount_zmw_minor_units is null or p_amount_zmw_minor_units <= 0 then raise exception 'INVALID_RESERVE_FUNDING_AMOUNT'; end if;
  if p_idempotency_key is null then raise exception 'RESERVE_IDEMPOTENCY_KEY_REQUIRED'; end if;
  if length(trim(coalesce(p_reference, ''))) < 3 or length(trim(p_reference)) > 200 then raise exception 'RESERVE_FUNDING_REFERENCE_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  select * into prior from public.creator_payout_reserve_movements where idempotency_key = p_idempotency_key;
  if found then
    if prior.kind <> 'FUND' or prior.amount_zmw_minor_units <> p_amount_zmw_minor_units or prior.reference <> trim(p_reference) then
      raise exception 'RESERVE_IDEMPOTENCY_MISMATCH';
    end if;
    select * into reserve from public.creator_payout_reserve where singleton;
    return jsonb_build_object('duplicate', true, 'availableMinorUnits', reserve.available_minor_units, 'heldMinorUnits', reserve.held_minor_units);
  end if;
  select * into reserve from public.creator_payout_reserve where singleton for update;
  update public.creator_payout_reserve set available_minor_units = available_minor_units + p_amount_zmw_minor_units, updated_at = now()
    where singleton returning * into reserve;
  insert into public.creator_payout_reserve_movements(
    kind, amount_zmw_minor_units, available_delta_minor_units, held_delta_minor_units,
    idempotency_key, reference, note, actor_id
  ) values ('FUND', p_amount_zmw_minor_units, p_amount_zmw_minor_units, 0,
    p_idempotency_key, trim(p_reference), left(trim(coalesce(p_note, '')), 1000), p_actor_id);
  return jsonb_build_object('duplicate', false, 'availableMinorUnits', reserve.available_minor_units, 'heldMinorUnits', reserve.held_minor_units);
end; $$;
revoke all on function public.fund_creator_payout_reserve(uuid, bigint, text, text, uuid) from public, anon, authenticated;
grant execute on function public.fund_creator_payout_reserve(uuid, bigint, text, text, uuid) to service_role;

create or replace function public.start_creator_payout_transfer(
  p_payout_request_id uuid, p_actor_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare payout public.creator_payout_requests;
begin
  select * into payout from public.creator_payout_requests where id = p_payout_request_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if payout.writer_id = p_actor_id then raise exception 'PAYOUT_SELF_APPROVAL_FORBIDDEN'; end if;
  if payout.status <> 'APPROVED' or payout.reserve_state <> 'HELD' then raise exception 'PAYOUT_NOT_READY_FOR_TRANSFER'; end if;
  update public.creator_payout_requests set status = 'PROCESSING', payment_outcome = 'IN_PROGRESS',
    updated_at = now() where id = payout.id returning * into payout;
  insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
    values (payout.id, p_actor_id, 'TRANSFER_STARTED', 'APPROVED', payout.status, 'Manual transfer started by administrator.');
  return jsonb_build_object('id', payout.id, 'status', payout.status, 'paymentOutcome', payout.payment_outcome);
end; $$;
revoke all on function public.start_creator_payout_transfer(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_creator_payout_transfer(uuid, uuid) to service_role;

create or replace function public.reconcile_creator_payout(
  p_payout_request_id uuid, p_actor_id uuid, p_outcome text, p_provider_reference text, p_note text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare payout public.creator_payout_requests; reserve public.creator_payout_reserve;
begin
  if p_outcome not in ('uncertain', 'paid', 'failed') then raise exception 'INVALID_PAYOUT_OUTCOME'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 or length(trim(p_note)) > 1000 then raise exception 'PAYOUT_RECONCILIATION_NOTE_REQUIRED'; end if;
  if p_outcome = 'paid' and length(trim(coalesce(p_provider_reference, ''))) < 3 then raise exception 'PAYMENT_REFERENCE_REQUIRED'; end if;
  select * into payout from public.creator_payout_requests where id = p_payout_request_id for update;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  if payout.writer_id = p_actor_id then raise exception 'PAYOUT_SELF_APPROVAL_FORBIDDEN'; end if;
  if payout.status <> 'PROCESSING' or payout.reserve_state <> 'HELD' then raise exception 'PAYOUT_NOT_RECONCILABLE'; end if;

  if p_outcome = 'uncertain' then
    update public.creator_payout_requests set payment_outcome = 'UNCERTAIN', reconciled_by = p_actor_id,
      updated_at = now() where id = payout.id returning * into payout;
    insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
      values (payout.id, p_actor_id, 'PAYMENT_UNCERTAIN', 'PROCESSING', payout.status, trim(p_note));
    return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state, 'paymentOutcome', payout.payment_outcome);
  end if;

  select * into reserve from public.creator_payout_reserve where singleton for update;
  if reserve.held_minor_units < payout.amount_zmw_minor_units then raise exception 'PAYOUT_RESERVE_HOLD_MISMATCH'; end if;
  if p_outcome = 'paid' then
    update public.creator_cash_accounts set reserved_usd_cents = reserved_usd_cents - payout.amount_usd_cents,
      lifetime_paid_usd_cents = lifetime_paid_usd_cents + payout.amount_usd_cents, updated_at = now()
      where writer_id = payout.writer_id and reserved_usd_cents >= payout.amount_usd_cents;
    if not found then raise exception 'PAYOUT_ACCOUNT_RESERVATION_MISMATCH'; end if;
    update public.creator_payout_reserve set held_minor_units = held_minor_units - payout.amount_zmw_minor_units,
      updated_at = now() where singleton and held_minor_units >= payout.amount_zmw_minor_units;
    if not found then raise exception 'PAYOUT_RESERVE_HOLD_MISMATCH'; end if;
    insert into public.creator_payout_reserve_movements(
      kind, amount_zmw_minor_units, available_delta_minor_units, held_delta_minor_units,
      payout_request_id, idempotency_key, reference, note, actor_id
    ) values ('PAYOUT_PAID', payout.amount_zmw_minor_units, 0, -payout.amount_zmw_minor_units,
      payout.id, gen_random_uuid(), trim(p_provider_reference), trim(p_note), p_actor_id);
    update public.creator_payout_requests set status = 'PAID', reserve_state = 'PAID',
      payment_outcome = 'CONFIRMED', provider_reference = trim(p_provider_reference),
      paid_at = now(), reconciled_by = p_actor_id, updated_at = now()
      where id = payout.id returning * into payout;
    perform public.write_creator_payout_journal(
      'PAYOUT_PAID', payout.id::text, payout.writer_id, payout.amount_usd_cents,
      jsonb_build_object('payout_request_id', payout.id, 'provider_reference', trim(p_provider_reference))
    );
    insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note, provider_reference)
      values (payout.id, p_actor_id, 'PAID', 'PROCESSING', payout.status, trim(p_note), trim(p_provider_reference));
  else
    update public.creator_cash_accounts set available_usd_cents = available_usd_cents + payout.amount_usd_cents,
      reserved_usd_cents = reserved_usd_cents - payout.amount_usd_cents, updated_at = now()
      where writer_id = payout.writer_id and reserved_usd_cents >= payout.amount_usd_cents;
    if not found then raise exception 'PAYOUT_ACCOUNT_RESERVATION_MISMATCH'; end if;
    update public.creator_payout_reserve set available_minor_units = available_minor_units + payout.amount_zmw_minor_units,
      held_minor_units = held_minor_units - payout.amount_zmw_minor_units, updated_at = now()
      where singleton and held_minor_units >= payout.amount_zmw_minor_units;
    if not found then raise exception 'PAYOUT_RESERVE_HOLD_MISMATCH'; end if;
    insert into public.creator_payout_reserve_movements(
      kind, amount_zmw_minor_units, available_delta_minor_units, held_delta_minor_units,
      payout_request_id, idempotency_key, note, actor_id
    ) values ('PAYOUT_RELEASED', payout.amount_zmw_minor_units, payout.amount_zmw_minor_units,
      -payout.amount_zmw_minor_units, payout.id, gen_random_uuid(), trim(p_note), p_actor_id);
    update public.creator_payout_requests set status = 'FAILED', reserve_state = 'RELEASED',
      payment_outcome = 'FAILED', failed_by = p_actor_id, failure_note = trim(p_note),
      reconciled_by = p_actor_id, updated_at = now()
      where id = payout.id returning * into payout;
    perform public.write_creator_payout_journal(
      'PAYOUT_RELEASE', payout.id::text || ':failed', payout.writer_id, payout.amount_usd_cents,
      jsonb_build_object('payout_request_id', payout.id, 'reason', trim(p_note))
    );
    insert into public.creator_payout_audit(payout_request_id, actor_id, action, previous_status, new_status, note)
      values (payout.id, p_actor_id, 'FAILED', 'PROCESSING', payout.status, trim(p_note));
  end if;
  return jsonb_build_object('id', payout.id, 'status', payout.status, 'reserveState', payout.reserve_state, 'paymentOutcome', payout.payment_outcome);
end; $$;
revoke all on function public.reconcile_creator_payout(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.reconcile_creator_payout(uuid, uuid, text, text, text) to service_role;

alter table public.creator_payout_reserve enable row level security;
alter table public.creator_payout_reserve_movements enable row level security;
alter table public.creator_payout_audit enable row level security;
revoke all on public.creator_payout_reserve, public.creator_payout_reserve_movements, public.creator_payout_audit from anon, authenticated;
grant all on public.creator_payout_reserve, public.creator_payout_reserve_movements, public.creator_payout_audit to service_role;

commit;
