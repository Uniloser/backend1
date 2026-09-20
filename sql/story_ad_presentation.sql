-- Optional creative configuration. Existing ads continue to render without it.
-- Run after story_ads.sql. No existing campaigns or trigger schedules are changed.
alter table public.story_ads
  add column if not exists presentation jsonb not null default '{}'::jsonb;

-- Creative data only. ReadAgora owns layout dimensions, disclosure and typography.
alter table public.story_ads drop constraint if exists story_ads_presentation_object;
alter table public.story_ads add constraint story_ads_presentation_object
  check (jsonb_typeof(presentation) = 'object');

-- Example (substitute a real ad UUID before running):
-- update public.story_ads set presentation = '{
--   "layout": "cinematic", "mood": "fantasy",
--   "tagline": "Power always leaves a price.",
--   "accentColor": "#D9C1F2", "ctaText": "Read Story"
-- }'::jsonb where id = 'YOUR-AD-UUID';
