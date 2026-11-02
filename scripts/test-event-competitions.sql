-- Isolated database only. This fixture never connects to the deployed project.
create schema auth;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,raw_app_meta_data jsonb default '{}');
create table public.users(id uuid primary key references auth.users(id),username text,display_name text);
create table public.stories(id uuid primary key,author_id uuid references public.users(id),title text,description text,cover_url text,genre text,status text,visibility text,moderation_status text,created_at timestamptz default now());
\ir ../sql/event_champions.sql
\ir ../sql/community_events_admin.sql
\ir ../sql/event_story_voting.sql
\ir ../sql/event_competitions.sql
\ir ../sql/event_competitions.sql
insert into auth.users(id,email_confirmed_at,raw_app_meta_data) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n<>6 then now() end,case when n=1 then '{"role":"admin"}'::jsonb else '{}'::jsonb end from generate_series(1,6)n;
insert into public.users select id,'user'||right(id::text,1),'User '||right(id::text,1) from auth.users;
insert into public.stories(id,author_id,title,genre,status,visibility,moderation_status,created_at) select ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Story '||n,'Fantasy','published','public','approved',now()-interval '30 days' from generate_series(2,3)n;
insert into public.community_events(id,slug,title,status,starts_at,ends_at,entry_starts_at,entry_ends_at,voting_starts_at,voting_ends_at) values('20000000-0000-4000-8000-000000000001','who-owns-readagora','Who Owns ReadAgora?','live',now()-interval '3 days',now()+interval '2 days',now()-interval '3 days',now()+interval '1 day',now()-interval '1 day',now()+interval '2 days');
select public.submit_event_story('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');
select public.submit_event_story('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003');
do $$ begin
 begin perform public.submit_event_story('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');raise exception 'TEST duplicate entry accepted';exception when others then if sqlerrm like 'TEST%' then raise; end if; end;
 begin perform public.cast_event_story_vote('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000004');raise exception 'TEST pending entry accepted';exception when others then if sqlerrm like 'TEST%' then raise; end if; end;
end $$;
select public.review_event_competition('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','approve_entry','10000000-0000-4000-8000-000000000002',null,'Original story reviewed');
select public.review_event_competition('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','approve_entry','10000000-0000-4000-8000-000000000003',null,'Original story reviewed');
do $$ begin
 begin perform public.cast_event_story_vote('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');raise exception 'TEST self vote accepted';exception when others then if sqlerrm like 'TEST%' then raise; end if; end;
 begin perform public.cast_event_story_vote('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000006');raise exception 'TEST unverified reader accepted';exception when others then if sqlerrm like 'TEST%' then raise; end if; end;
 begin perform public.review_event_competition('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004','close_voting',null,null,'Attempt by reader');raise exception 'TEST nonadmin accepted';exception when others then if sqlerrm like 'TEST%' then raise; end if; end;
end $$;
