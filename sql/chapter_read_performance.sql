create index if not exists idx_chapters_story_order_id
  on public.chapters (story_id, chapter_order, id);
