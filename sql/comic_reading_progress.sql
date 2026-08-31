-- Comic reading progress — run after comic_schema.sql
alter table public.reading_progress
  add column if not exists last_panel_index integer check (last_panel_index is null or last_panel_index >= 0);
