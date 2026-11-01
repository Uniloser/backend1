-- Run ONLY in an empty isolated test database: psql -v ON_ERROR_STOP=1 -f scripts/test-ad-placements.sql
create schema auth;
create table auth.users(id uuid primary key);
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end$$;
\ir ../sql/ad_placements.sql
begin;
do $$
declare cid uuid; banner uuid; detail uuid; disabled uuid; payload jsonb; ad jsonb; second_ad jsonb; token uuid; count_events integer;
begin
 select id into banner from ad_placements where platform='website' and placement_key='home_banner';
 select id into detail from ad_placements where platform='website' and placement_key='story_detail';
 select id into disabled from ad_placements where placement_key='between_chapters';
 payload:=jsonb_build_object('name','Test campaign','headline','Actual creative','description','Description','status','published','start_at',now()-interval '1 hour','end_at',null,
 'creative',jsonb_build_object('creative_type','image','image_url','https://example.com/image.webp','destination_url','https://example.com'),
 'placements',jsonb_build_array(jsonb_build_object('placement_id',banner,'priority',1,'frequency_limit',1,'rotation_seconds',60,'audience','all','active',true),
 jsonb_build_object('placement_id',detail,'priority',1,'frequency_limit',3,'rotation_seconds',60,'audience','all','active',true)));
 cid:=save_ad_campaign(payload);
 if (select count(*) from ad_creatives where campaign_id=cid)<>1 then raise exception 'Creative not shared'; end if;
 ad:=deliver_ad('home_banner','website','actor-a',null); token:=(ad->>'delivery_token')::uuid;
 if token is null then raise exception 'Eligible campaign missing'; end if;
 second_ad:=deliver_ad('home_banner','website','actor-a',null);
 if second_ad->>'delivery_token'<>token::text then raise exception 'Repeated GET changed token'; end if;
 if exists(select 1 from ad_events) then raise exception 'Preload counted an impression'; end if;
 if record_ad_event(cid,token,'wrong-actor','impression') then raise exception 'Forged actor accepted'; end if;
 if record_ad_event(cid,token,'actor-a','click') then raise exception 'Click before impression accepted'; end if;
 if not record_ad_event(cid,token,'actor-a','impression') then raise exception 'Visible impression rejected'; end if;
 if record_ad_event(cid,token,'actor-a','impression') then raise exception 'Duplicate impression accepted'; end if;
 if not record_ad_event(cid,token,'actor-a','click') then raise exception 'Click rejected'; end if;
 if record_ad_event(cid,token,'actor-a','click') then raise exception 'Duplicate click accepted'; end if;
 if deliver_ad('home_banner','website','actor-a',null) is not null then raise exception 'Daily cap exceeded'; end if;
 if deliver_ad('home_banner','android','actor-b',null) is not null then raise exception 'Platform leaked'; end if;
 perform change_ad_assignment(cid,banner,'{"active":false}');
 if deliver_ad('home_banner','website','actor-b',null) is not null then raise exception 'Paused placement served'; end if;
 if deliver_ad('story_detail','website','actor-b',null) is null then raise exception 'Other placement was paused'; end if;
 perform change_ad_assignment(cid,banner,null);
 if (select count(*) from ad_campaign_placements where campaign_id=cid)<>1 then raise exception 'Removal affected other placements'; end if;
 if not exists(select 1 from ad_campaigns where id=cid) then raise exception 'Removal deleted campaign'; end if;
 update ad_campaigns set status='paused' where id=cid;
 if deliver_ad('story_detail','website','actor-c',null) is not null then raise exception 'Paused campaign served'; end if;
 update ad_campaigns set status='published',start_at=now()+interval '1 day' where id=cid;
 if deliver_ad('story_detail','website','actor-c',null) is not null then raise exception 'Future campaign served'; end if;
 update ad_campaigns set start_at=now()-interval '2 days',end_at=now()-interval '1 day' where id=cid;
 if deliver_ad('story_detail','website','actor-c',null) is not null then raise exception 'Expired campaign served'; end if;
 update ad_campaigns set end_at=null where id=cid;
 perform change_ad_assignment(cid,detail,'{"audience":"authenticated"}');
 if deliver_ad('story_detail','website','actor-c',null) is not null then raise exception 'Audience filter ignored'; end if;
 begin
  perform save_ad_campaign(payload||jsonb_build_object('creative',jsonb_build_object('creative_type','text','destination_url','https://example.com')));
  raise exception 'Incompatible format was accepted';
 exception when raise_exception then if SQLERRM='Incompatible format was accepted' then raise; end if; end;
 begin
  perform change_ad_assignment(cid,disabled,'{"active":true}');
  raise exception 'Disabled placement was accepted';
 exception when raise_exception then if SQLERRM='Disabled placement was accepted' then raise; end if; end;
 if has_function_privilege('anon','public.deliver_ad(text,text,text,uuid)','EXECUTE') then raise exception 'Anonymous RPC privilege leaked'; end if;
 if has_table_privilege('authenticated','public.ad_events','INSERT') then raise exception 'Direct analytics writes permitted'; end if;
 raise notice 'PASS: sharing, schedules, platforms, format compatibility, pauses, audience, caps, token binding, deduplication and access control';
end $$;
rollback;
