begin;
insert into auth.users(id) select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,5) i;
insert into public.users(id,username) select id,'user-'||right(id::text,1) from auth.users;
insert into public.stories(id,author_id,title,description,genre,status,is_complete) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Source','test','Fantasy','published',true),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Similar','test','Fantasy','published',false),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','No chapters','test','Fantasy','published',false);
insert into public.chapters(id,story_id,title,content,chapter_order,status,published_at) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','One','text',1,'published',now()-interval '2 days'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Two','text',2,'published',now()),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','One','text',1,'published',now());
do $$ begin
 if (select count(*) from discovery_eligible)<>2 then raise exception 'chapter eligibility failed'; end if;
 if (select chapters_published from stories where title='Source')<>2 then raise exception 'chapter counter failed'; end if;
end $$;
insert into public.story_views(story_id,user_id,created_at) select '10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',now() from generate_series(1,100);
insert into public.story_views(story_id,user_id) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.likes(user_id,story_id) values
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002');
select discovery_record_chapter('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
select discovery_record_chapter('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
select discovery_record_chapter('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
do $$ declare m jsonb; begin
 select metrics into m from discovery_metrics_batch(null,100) where story_id='10000000-0000-4000-8000-000000000001';
 if (m->>'unique_readers')::int<>1 or (m->>'reads_7d')::int<>3 then raise exception 'deduplicated views failed: %',m; end if;
 if (m->>'completion_rate')::float<>1 or (m->>'retention_rate')::float<>1 then raise exception 'completion/retention failed: %',m; end if;
 if (select count(*) from user_events where event_type='chapter_read')<>2 then raise exception 'chapter idempotency failed'; end if;
 if (select count(*) from user_events where event_type='story_complete')<>1 then raise exception 'completion event failed'; end if;
 if not exists(select 1 from discovery_user_signals('00000000-0000-4000-8000-000000000003') where completed and chapters_read=2) then raise exception 'user profile failed'; end if;
 if not exists(select 1 from discovery_collaborative(array['10000000-0000-4000-8000-000000000001'::uuid],null) where story_id='10000000-0000-4000-8000-000000000002') then raise exception 'collaboration failed'; end if;
end $$;
insert into user_blocks(blocker_id,blocked_id) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003');
do $$ begin
 if not (discovery_exclusions('00000000-0000-4000-8000-000000000003')->'blocked') ? '00000000-0000-4000-8000-000000000001' then raise exception 'reverse block failed'; end if;
end $$;
update auth.users set banned_until=now()+interval '1 year' where id='00000000-0000-4000-8000-000000000002';
do $$ begin if exists(select 1 from discovery_eligible where author_id='00000000-0000-4000-8000-000000000002') then raise exception 'ban failed'; end if; end $$;
update stories set visibility='private' where title='Source';
do $$ begin
 if discovery_can_read_story('10000000-0000-4000-8000-000000000001',null) then raise exception 'private direct read allowed'; end if;
 if not discovery_can_read_story('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001') then raise exception 'author draft access lost'; end if;
end $$;
do $$ begin if exists(select 1 from discovery_eligible) then raise exception 'private visibility failed'; end if; end $$;
update stories set visibility='public',moderation_status='hidden' where title='Source';
do $$ begin if exists(select 1 from discovery_eligible) then raise exception 'moderation failed'; end if; end $$;
update stories set moderation_status='approved' where title='Source';
update chapters set status='draft' where story_id='10000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from discovery_eligible) then raise exception 'unpublished chapters failed'; end if; end $$;
do $$ begin
 if has_table_privilege('anon','discovery_eligible','select') then raise exception 'private view exposed'; end if;
 if has_function_privilege('authenticated','discovery_metrics_batch(uuid,integer)','execute') then raise exception 'private RPC exposed'; end if;
end $$;
rollback;
select 'All discovery database assertions passed' result;
