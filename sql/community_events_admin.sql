-- Apply after event_champions.sql. Existing champion records are preserved.
alter table public.community_events
 add column if not exists description text not null default '',
 add column if not exists theme text not null default '',
 add column if not exists rules text not null default '',
 add column if not exists prizes text not null default '',
 add column if not exists starts_at timestamptz,
 add column if not exists voting_starts_at timestamptz,
 add column if not exists voting_ends_at timestamptz;
do $$ begin
 if not exists (select 1 from pg_constraint where conname='community_events_schedule_check' and conrelid='public.community_events'::regclass) then
  alter table public.community_events add constraint community_events_schedule_check check (
   (starts_at is null or starts_at < ends_at) and
   ((voting_starts_at is null and voting_ends_at is null) or
    (starts_at is not null and voting_starts_at is not null and voting_ends_at is not null and
     voting_starts_at >= starts_at and voting_ends_at > voting_starts_at and voting_ends_at <= ends_at))
  );
 end if;
end $$;
