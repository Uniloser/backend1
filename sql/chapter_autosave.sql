-- ============================================================
-- CHAPTER AUTOSAVE — adds lightweight autosave columns
-- Run this after the base schema has been applied
-- ============================================================

-- Two nullable columns on chapters:
--   autosave_content  — the raw HTML/JSON blob from the editor
--   autosaved_at      — timestamp of the last autosave write
alter table public.chapters
  add column if not exists autosave_content text,
  add column if not exists autosaved_at timestamptz;
