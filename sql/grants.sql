-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Fixes "permission denied for table ..." when tables were created without
-- default role grants.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
	GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
	GRANT SELECT ON TABLES TO anon;

-- Optional: public read of published stories for direct client access.
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published stories" ON public.stories;
CREATE POLICY "Public read published stories"
	ON public.stories FOR SELECT
	USING (status = 'published');

DROP POLICY IF EXISTS "Public read published chapters" ON public.chapters;
CREATE POLICY "Public read published chapters"
	ON public.chapters FOR SELECT
	USING (status = 'published');

DROP POLICY IF EXISTS "Public read user profiles" ON public.users;
CREATE POLICY "Public read user profiles"
	ON public.users FOR SELECT
	USING (true);
