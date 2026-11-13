-- Isolated database only; run after test-event-competitions.sql.
insert into public.community_events(id,slug,title,status,starts_at,ends_at,entry_starts_at,entry_ends_at)
values ('20000000-0000-4000-8000-000000000011','auto-approval-test','Automatic approval','live',now()-interval '2 days',now()+interval '1 day',now()-interval '2 days',now()+interval '1 day'),
('20000000-0000-4000-8000-000000000012','closed-auto-test','Closed approval','completed',now()-interval '3 days',now()-interval '1 day',now()-interval '3 days',now()-interval '1 day');
insert into public.event_story_entries(event_id,story_id,author_id,eligibility_status)
values ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','pending'),
('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','rejected'),
('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','pending');
\ir ../sql/event_entry_auto_approval.sql
\ir ../sql/event_entry_auto_approval.sql
do $$ begin
 if (select eligibility_status from event_story_entries where event_id='20000000-0000-4000-8000-000000000011' and story_id='10000000-0000-4000-8000-000000000002')<>'approved' then raise exception 'Eligible pending entry was not approved'; end if;
 if (select eligibility_status from event_story_entries where event_id='20000000-0000-4000-8000-000000000011' and story_id='10000000-0000-4000-8000-000000000003')<>'rejected' then raise exception 'Rejected entry was changed'; end if;
 if (select eligibility_status from event_story_entries where event_id='20000000-0000-4000-8000-000000000012')<>'pending' then raise exception 'Closed event was changed'; end if;
end $$;
-- Each rejection must be raised by the production function, not this test.
do $$ declare e uuid='20000000-0000-4000-8000-000000000011';s uuid='10000000-0000-4000-8000-000000000003';u uuid='00000000-0000-4000-8000-000000000003';begin
 delete from event_story_entries where event_id=e and story_id=s;
 update stories set visibility='private' where id=s;
 begin perform submit_event_story(e,s,u);raise exception 'TEST private story accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 update stories set visibility='public',status='draft' where id=s;
 begin perform submit_event_story(e,s,u);raise exception 'TEST draft accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 update stories set status='published',moderation_status='rejected' where id=s;
 begin perform submit_event_story(e,s,u);raise exception 'TEST unapproved story accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 update stories set moderation_status='approved' where id=s;
 update auth.users set email_confirmed_at=null where id=u;
 begin perform submit_event_story(e,s,u);raise exception 'TEST unverified author accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 day' where id=u;
 begin perform submit_event_story(e,s,u);raise exception 'TEST banned author accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 update auth.users set banned_until=null where id=u;
 begin perform submit_event_story(e,s,'00000000-0000-4000-8000-000000000004');raise exception 'TEST non-owner accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 perform submit_event_story(e,s,u);
 if (select eligibility_status from event_story_entries where event_id=e and story_id=s)<>'approved' then raise exception 'Eligible submission was not approved';end if;
 begin perform submit_event_story(e,s,u);raise exception 'TEST duplicate accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
 delete from event_story_entries where event_id=e and story_id=s;
 update community_events set entry_ends_at=now()-interval '1 hour' where id=e;
 begin perform submit_event_story(e,s,u);raise exception 'TEST late entry accepted';exception when others then if sqlerrm like 'TEST%' then raise;end if;end;
end $$;
