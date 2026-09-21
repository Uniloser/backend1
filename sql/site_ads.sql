create table if not exists public.site_ads (
	id uuid primary key default uuid_generate_v4(),
	title text not null,
	message text not null,
	bold_text text,
	cta_text text not null default 'Report a bug',
	cta_url text not null,
	presentation jsonb not null default '{}'::jsonb,
	status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
	starts_at timestamptz not null default now(),
	ends_at timestamptz,
	created_at timestamptz not null default now(),
	constraint site_ads_dates_valid check (ends_at is null or ends_at > starts_at),
	constraint site_ads_presentation_object check (jsonb_typeof(presentation) = 'object')
);

create index if not exists idx_site_ads_active_window
	on public.site_ads (status, starts_at, ends_at, created_at desc);

alter table public.site_ads enable row level security;

create policy "Active site ads are publicly readable"
	on public.site_ads for select using (
		status = 'active'
		and starts_at <= now()
		and (ends_at is null or ends_at >= now())
	);

grant select on public.site_ads to anon, authenticated;
