create table public.genres (
	id uuid primary key default uuid_generate_v4(),
	name text not null unique,
	slug text not null unique,
	created_at timestamptz not null default now()
);

insert into public.genres (name, slug) values
	('Fantasy', 'fantasy'),
	('Romance', 'romance'),
	('Mystery', 'mystery'),
	('Drama', 'drama'),
	('Sci-fi', 'sci-fi'),
	('Comedy', 'comedy'),
	('Action', 'action')
on conflict (slug) do nothing;

alter table public.stories add column if not exists genre_id uuid references public.genres(id);

update public.stories s
set genre_id = g.id
from public.genres g
where s.genre_id is null
	and lower(trim(s.genre)) = lower(g.name);

create index if not exists idx_stories_genre_id on public.stories (genre_id);

alter table public.genres enable row level security;
create policy "Genres are publicly readable" on public.genres for select using (true);
grant select on public.genres to anon, authenticated;