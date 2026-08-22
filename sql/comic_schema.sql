-- ============================================================
-- COMIC SUPPORT — additions to the existing schema
-- Run this AFTER schema.sql has already been applied
-- ============================================================

-- ------------------------------------------------------------
-- 1. STORY TYPE: TEXT | COMIC
-- ------------------------------------------------------------
alter table public.stories
  add column content_type text not null default 'text'
  check (content_type in ('text', 'comic'));

-- ------------------------------------------------------------
-- 2. CHAPTER TYPE (a story could technically mix, but usually
--    matches the parent story's content_type)
-- ------------------------------------------------------------
alter table public.chapters
  add column content_type text not null default 'text'
  check (content_type in ('text', 'comic'));

-- For comic chapters, `chapters.content` is simply unused/empty.
-- Panels live in comic_panels instead, keyed off chapter_id.

-- ------------------------------------------------------------
-- 3. COMIC PANELS (one row per image/panel in a chapter)
-- ------------------------------------------------------------
create table public.comic_panels (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  panel_order integer not null,
  image_url text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, panel_order)
);

create index idx_comic_panels_chapter on public.comic_panels(chapter_id);

create trigger trg_comic_panels_updated_at before update on public.comic_panels
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. SPEECH BUBBLES (stored separately, overlaid on the panel
--    at render time — not baked into the image)
-- ------------------------------------------------------------
create table public.speech_bubbles (
  id uuid primary key default uuid_generate_v4(),
  panel_id uuid not null references public.comic_panels(id) on delete cascade,
  bubble_type text not null default 'speech'
    check (bubble_type in ('speech', 'narration', 'sfx')),
  text text not null,
  -- position/size expressed as a percentage of the panel's dimensions (0-100)
  -- rather than raw pixels, so bubbles stay correctly placed at any screen size
  x numeric not null check (x >= 0 and x <= 100),
  y numeric not null check (y >= 0 and y <= 100),
  width numeric not null check (width > 0 and width <= 100),
  height numeric not null check (height > 0 and height <= 100),
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_speech_bubbles_panel on public.speech_bubbles(panel_id);

create trigger trg_speech_bubbles_updated_at before update on public.speech_bubbles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.comic_panels enable row level security;
alter table public.speech_bubbles enable row level security;

-- COMIC PANELS: published-chapter panels viewable by everyone,
-- draft-chapter panels only by the story's author
create policy "Comic panels are viewable if their chapter is published or owned"
  on public.comic_panels for select using (
    exists (
      select 1 from public.chapters c
      join public.stories s on s.id = c.story_id
      where c.id = chapter_id
        and (c.status = 'published' or s.author_id = auth.uid())
    )
  );

create policy "Authors can insert panels on their own chapters"
  on public.comic_panels for insert with check (
    exists (
      select 1 from public.chapters c
      join public.stories s on s.id = c.story_id
      where c.id = chapter_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can update panels on their own chapters"
  on public.comic_panels for update using (
    exists (
      select 1 from public.chapters c
      join public.stories s on s.id = c.story_id
      where c.id = chapter_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can delete panels on their own chapters"
  on public.comic_panels for delete using (
    exists (
      select 1 from public.chapters c
      join public.stories s on s.id = c.story_id
      where c.id = chapter_id and s.author_id = auth.uid()
    )
  );

-- SPEECH BUBBLES: same visibility/ownership rules, one level deeper
create policy "Speech bubbles are viewable if their panel is published or owned"
  on public.speech_bubbles for select using (
    exists (
      select 1 from public.comic_panels p
      join public.chapters c on c.id = p.chapter_id
      join public.stories s on s.id = c.story_id
      where p.id = panel_id
        and (c.status = 'published' or s.author_id = auth.uid())
    )
  );

create policy "Authors can insert bubbles on their own panels"
  on public.speech_bubbles for insert with check (
    exists (
      select 1 from public.comic_panels p
      join public.chapters c on c.id = p.chapter_id
      join public.stories s on s.id = c.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can update bubbles on their own panels"
  on public.speech_bubbles for update using (
    exists (
      select 1 from public.comic_panels p
      join public.chapters c on c.id = p.chapter_id
      join public.stories s on s.id = c.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can delete bubbles on their own panels"
  on public.speech_bubbles for delete using (
    exists (
      select 1 from public.comic_panels p
      join public.chapters c on c.id = p.chapter_id
      join public.stories s on s.id = c.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );
