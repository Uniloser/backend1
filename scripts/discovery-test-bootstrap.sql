-- Isolated test database only. Supabase auth objects needed by the real schema.
create schema auth;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
\ir ../src/schema/schema.txt
\ir ../sql/genres.sql
alter table public.stories add column content_type text not null default 'text';
\ir ../sql/discovery.sql
-- Applying twice must preserve data and succeed.
\ir ../sql/discovery.sql
