create table public.story_ads (
	id uuid primary key default uuid_generate_v4(),
	story_id uuid not null references public.stories(id) on delete cascade,
	title text not null,
	description text not null,
	image_url text not null,
	background_image_url text,
	button_text text not null default 'View more',
	promotion_type text not null default 'boost' check (promotion_type in ('boost', 'featured', 'reward')),
	status text not null default 'active' check (status in ('draft', 'active', 'paused', 'completed')),
	budget integer not null default 0 check (budget >= 0),
	spent integer not null default 0 check (spent >= 0 and spent <= budget),
	priority integer not null default 0,
	starts_at timestamptz not null default now(),
	ends_at timestamptz,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	constraint story_ads_dates_valid check (ends_at is null or ends_at > starts_at)
);

create index idx_story_ads_active_window
	on public.story_ads (is_active, starts_at, ends_at, priority desc);

create table public.story_ad_events (
	id uuid primary key default uuid_generate_v4(),
	ad_id uuid not null references public.story_ads(id) on delete cascade,
	event_type text not null check (event_type in ('impression', 'click')),
	user_id uuid references public.users(id) on delete set null,
	session_id text,
	created_at timestamptz not null default now()
);

create index idx_story_ad_events_ad_type on public.story_ad_events (ad_id, event_type);

alter table public.story_ads enable row level security;
alter table public.story_ad_events enable row level security;

create policy "Active story ads are publicly readable"
	on public.story_ads for select using (
		is_active = true
		and starts_at <= now()
		and (ends_at is null or ends_at >= now())
	);

grant select on public.story_ads to anon, authenticated;
grant insert on public.story_ad_events to anon, authenticated;

alter table public.story_ads add column if not exists promotion_type text not null default 'boost';
alter table public.story_ads add column if not exists status text not null default 'active';
alter table public.story_ads add column if not exists budget integer not null default 0;
alter table public.story_ads add column if not exists spent integer not null default 0;

create policy "Authors can manage promotions for their stories"
	on public.story_ads for all using (
		exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
	) with check (
		exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid())
	);

-- Example campaign: replace the title filter with the published story you want to promote.
insert into public.story_ads (
	story_id,
	title,
	description,
	image_url,
	background_image_url,
	button_text,
	priority,
	starts_at,
	ends_at,
	is_active
)
select
	s.id,
	'Pregnant and Rejected Mate',
	'Some wounds do not bleed where anyone can see them.',
	s.cover_url,
	null,
	'View more',
	10,
	now(),
	now() + interval '30 days',
	true
from public.stories s
where s.status = 'published'
	and s.title = 'Pregnant and Rejected Mate'
	and s.cover_url is not null
limit 1;