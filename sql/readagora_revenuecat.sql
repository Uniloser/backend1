-- RevenueCat writes subscription events into the shared subscriptions table.
-- Apply after readagora_premium_access.sql.
begin;

alter table public.subscriptions
  add column if not exists provider_event_timestamp_ms bigint;

-- The base premium-access migration predates the RevenueCat plans and only
-- permits READAGORA_PLUS_WEEKLY. Keep that legacy value while allowing the
-- lifetime and auto-renewing products written by the RevenueCat webhook.
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('READAGORA_PLUS_WEEKLY', 'LIFETIME', 'YEARLY', 'MONTHLY'));

commit;
