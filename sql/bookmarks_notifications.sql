-- Run in Supabase SQL Editor if bookmarks / notifications / notification_deliveries
-- are missing from an existing database (Project → SQL → New query).

-- ============================================================
-- BOOKMARKS
-- ============================================================
create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, story_id, chapter_id),
  check (note is null or char_length(note) <= 2_000)
);

create index if not exists idx_bookmarks_user on public.bookmarks(user_id, updated_at desc);
create index if not exists idx_bookmarks_story on public.bookmarks(story_id);
create unique index if not exists idx_bookmarks_user_story_null_chapter
  on public.bookmarks (user_id, story_id) where chapter_id is null;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  notification_type text not null check (notification_type in (
    'new_follower', 'story_published', 'chapter_published', 'comment', 'like', 'system'
  )),
  story_id uuid references public.stories(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient on public.notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(recipient_id, created_at desc)
  where read_at is null;

-- ============================================================
-- NOTIFICATION DELIVERIES
-- ============================================================
create table if not exists public.notification_deliveries (
  id uuid primary key default uuid_generate_v4(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('push', 'email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create index if not exists idx_notification_deliveries_pending on public.notification_deliveries(status, created_at)
  where status in ('pending', 'failed');

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_bookmarks_updated_at on public.bookmarks;
create trigger trg_bookmarks_updated_at before update on public.bookmarks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_notification_deliveries_updated_at on public.notification_deliveries;
create trigger trg_notification_deliveries_updated_at before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Users can view their own bookmarks" on public.bookmarks;
create policy "Users can view their own bookmarks"
  on public.bookmarks for select using (user_id = auth.uid());

drop policy if exists "Users can create their own bookmarks" on public.bookmarks;
create policy "Users can create their own bookmarks"
  on public.bookmarks for insert with check (user_id = auth.uid());

drop policy if exists "Users can update their own bookmarks" on public.bookmarks;
create policy "Users can update their own bookmarks"
  on public.bookmarks for update using (user_id = auth.uid());

drop policy if exists "Users can delete their own bookmarks" on public.bookmarks;
create policy "Users can delete their own bookmarks"
  on public.bookmarks for delete using (user_id = auth.uid());

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select using (recipient_id = auth.uid());

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update using (recipient_id = auth.uid());

drop policy if exists "No direct notification delivery access" on public.notification_deliveries;
create policy "No direct notification delivery access"
  on public.notification_deliveries for all using (false) with check (false);
