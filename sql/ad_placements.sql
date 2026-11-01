-- Centralized advertisements. Apply once using the Supabase SQL editor.
begin;
create table public.ad_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 headline text not null check(length(headline) between 1 and 160), description text not null default '' check(length(description)<=1000),
 status text not null default 'draft' check(status in ('draft','published','paused')),
 start_at timestamptz not null default now(), end_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_at is null or end_at>start_at)
);
create table public.ad_creatives (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null unique references public.ad_campaigns on delete cascade,
 creative_type text not null check(creative_type in ('image','text')), image_url text,
 destination_url text not null check(destination_url ~ '^https?://'), created_at timestamptz not null default now(),
 check(creative_type='text' or (image_url is not null and image_url ~ '^https://'))
);
create table public.ad_placements (
 id uuid primary key default gen_random_uuid(), placement_key text not null, platform text not null check(platform in ('website','android')),
 display_name text not null, description text not null, supported_formats text[] not null, enabled boolean not null default true,
 unique(platform,placement_key)
);
insert into public.ad_placements(placement_key,platform,display_name,description,supported_formats) values
 ('home_banner','website','Homepage banner','Above homepage discovery content.',array['image']),
 ('home_sections','website','Homepage sections','Between homepage content sections.',array['image','text']),
 ('discovery_feed','website','Story discovery','Above discovery and search results.',array['image','text']),
 ('story_detail','website','Story detail','After the story overview, outside the reader.',array['image','text']),
 ('sidebar','website','Website sidebar','Desktop discovery sidebar.',array['image','text']),
 ('coins_shop','website','Agora Coins shop','Below the wallet shop content.',array['image','text']),
 ('home_banner','android','Home banner','Above home discovery shelves.',array['image']),
 ('discovery_feed','android','Discovery feed','Within story discovery listings.',array['image','text']),
 ('recommendations','android','Recommendations','Between home recommendation sections.',array['image','text']),
 ('story_detail','android','Story detail','After story overview, outside chapter reading.',array['image','text']),
 ('between_chapters','android','Between chapters','Reserved: continuous reading has no safe intermission yet.',array['text']),
 ('coins_shop','android','Agora Coins shop','Below the coin store content.',array['image','text']);
update public.ad_placements set enabled=false where placement_key='between_chapters';
create table public.ad_campaign_placements (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.ad_campaigns on delete cascade,
 placement_id uuid not null references public.ad_placements, priority integer not null default 0 check(priority between 0 and 100),
 frequency_limit integer not null default 3 check(frequency_limit between 1 and 100),
 rotation_seconds integer not null default 300 check(rotation_seconds between 60 and 86400),
 audience text not null default 'all' check(audience in ('all','authenticated','anonymous')),
 active boolean not null default true, start_at timestamptz, end_at timestamptz,
 unique(campaign_id,placement_id), check(end_at is null or start_at is null or end_at>start_at)
);
create table public.ad_deliveries (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.ad_campaigns on delete cascade,
 placement_id uuid not null references public.ad_placements, actor_key text not null, user_id uuid references auth.users on delete set null,
 bucket bigint not null, expires_at timestamptz not null, created_at timestamptz not null default now(),
 unique(campaign_id,placement_id,actor_key,bucket)
);
create table public.ad_events (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.ad_campaigns on delete cascade,
 placement_id uuid not null references public.ad_placements, delivery_id uuid not null references public.ad_deliveries on delete cascade,
 event_type text not null check(event_type in ('impression','click')), actor_key text not null,
 user_id uuid references auth.users on delete set null, created_at timestamptz not null default now(), unique(delivery_id,event_type)
);
create index on public.ad_campaigns(status,start_at,end_at);
create index on public.ad_campaign_placements(placement_id,active,priority desc);
create index on public.ad_events(actor_key,campaign_id,placement_id,created_at) where event_type='impression';
create index on public.ad_events(campaign_id,event_type,created_at);
create index on public.ad_deliveries(expires_at);

-- One transaction for campaign, creative, and assignment changes.
create function public.save_ad_campaign(payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid := coalesce((payload->>'id')::uuid,gen_random_uuid()); item jsonb; fmt text := payload->'creative'->>'creative_type';
begin
 perform pg_advisory_xact_lock(hashtextextended(cid::text,0));
 if exists(select 1 from jsonb_array_elements(payload->'placements') p
   left join ad_placements l on l.id=(p->>'placement_id')::uuid
   where l.id is null or not l.enabled or not(fmt=any(l.supported_formats))) then
   raise exception 'Disabled, unknown, or incompatible placement'; end if;
 insert into ad_campaigns(id,name,headline,description,status,start_at,end_at)
 values(cid,payload->>'name',payload->>'headline',payload->>'description',payload->>'status',(payload->>'start_at')::timestamptz,(payload->>'end_at')::timestamptz)
 on conflict(id) do update set name=excluded.name,headline=excluded.headline,description=excluded.description,status=excluded.status,start_at=excluded.start_at,end_at=excluded.end_at,updated_at=now();
 insert into ad_creatives(campaign_id,creative_type,image_url,destination_url)
 values(cid,fmt,payload->'creative'->>'image_url',payload->'creative'->>'destination_url')
 on conflict(campaign_id) do update set creative_type=excluded.creative_type,image_url=excluded.image_url,destination_url=excluded.destination_url;
 delete from ad_campaign_placements where campaign_id=cid;
 for item in select * from jsonb_array_elements(payload->'placements') loop
   insert into ad_campaign_placements(campaign_id,placement_id,priority,frequency_limit,rotation_seconds,audience,active,start_at,end_at)
   values(cid,(item->>'placement_id')::uuid,(item->>'priority')::integer,(item->>'frequency_limit')::integer,(item->>'rotation_seconds')::integer,item->>'audience',(item->>'active')::boolean,(item->>'start_at')::timestamptz,(item->>'end_at')::timestamptz);
 end loop;
 return cid;
end $$;

create function public.deliver_ad(p_key text,p_platform text,p_actor text,p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare selected record; delivery ad_deliveries; result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 select c.*, cr.creative_type,cr.image_url,cr.destination_url,cp.placement_id,cp.rotation_seconds,cp.end_at as placement_end_at into selected
 from ad_campaigns c join ad_creatives cr on cr.campaign_id=c.id
 join ad_campaign_placements cp on cp.campaign_id=c.id join ad_placements p on p.id=cp.placement_id
 where p.placement_key=p_key and p.platform=p_platform and p.enabled and cp.active
 and cr.creative_type=any(p.supported_formats) and c.status='published'
 and c.start_at<=now() and (c.end_at is null or c.end_at>now())
 and (cp.start_at is null or cp.start_at<=now()) and (cp.end_at is null or cp.end_at>now())
 and (cp.audience='all' or cp.audience=case when p_user is null then 'anonymous' else 'authenticated' end)
 and (select count(*) from ad_events e where e.campaign_id=c.id and e.placement_id=p.id and e.actor_key=p_actor
   and e.event_type='impression' and e.created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')<cp.frequency_limit
 order by cp.priority desc, md5(c.id::text || p_actor || floor(extract(epoch from now())/cp.rotation_seconds)::text) limit 1;
 if selected.id is null then return null; end if;
 insert into ad_deliveries(campaign_id,placement_id,actor_key,user_id,bucket,expires_at)
 values(selected.id,selected.placement_id,p_actor,p_user,floor(extract(epoch from now())/selected.rotation_seconds),least(now()+interval '10 minutes',selected.end_at,selected.placement_end_at))
 on conflict(campaign_id,placement_id,actor_key,bucket) do update set actor_key=excluded.actor_key
 returning * into delivery;
 if delivery.expires_at<=now() then return null; end if;
 return jsonb_build_object('id',selected.id,'headline',selected.headline,'description',selected.description,
 'creative_type',selected.creative_type,'image_url',selected.image_url,'destination_url',selected.destination_url,
 'placement_id',selected.placement_id,'delivery_token',delivery.id,'expires_at',delivery.expires_at,'rotation_seconds',selected.rotation_seconds);
end $$;

create function public.record_ad_event(p_campaign uuid,p_delivery uuid,p_actor text,p_type text) returns boolean
language plpgsql security definer set search_path=public as $$
declare d ad_deliveries; config ad_campaign_placements; counted integer;
begin
 if p_type not in ('impression','click') then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 select * into d from ad_deliveries where id=p_delivery and campaign_id=p_campaign and actor_key=p_actor and expires_at>now();
 if d.id is null then return false; end if;
 select cp.* into config from ad_campaign_placements cp join ad_campaigns c on c.id=cp.campaign_id
 join ad_placements p on p.id=cp.placement_id join ad_creatives cr on cr.campaign_id=c.id
 where cp.campaign_id=d.campaign_id and cp.placement_id=d.placement_id and cp.active and p.enabled
 and c.status='published' and cr.creative_type=any(p.supported_formats)
 and c.start_at<=now() and (c.end_at is null or c.end_at>now())
 and (cp.start_at is null or cp.start_at<=now()) and (cp.end_at is null or cp.end_at>now());
 if config.id is null then return false; end if;
 if p_type='impression' then
   if (select count(*) from ad_events where actor_key=p_actor and campaign_id=p_campaign and placement_id=d.placement_id
     and event_type='impression' and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=config.frequency_limit then return false; end if;
 else
   if not exists(select 1 from ad_events where delivery_id=d.id and event_type='impression') then return false; end if;
 end if;
 insert into ad_events(campaign_id,placement_id,delivery_id,event_type,actor_key,user_id)
 values(d.campaign_id,d.placement_id,d.id,p_type,p_actor,d.user_id) on conflict do nothing;
 get diagnostics counted = row_count;
 return counted>0;
end $$;

create function public.change_ad_assignment(p_campaign uuid,p_placement uuid,p_patch jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare payload jsonb; current_value jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_campaign::text,0));
 select to_jsonb(c) || jsonb_build_object('creative',(select to_jsonb(cr) from ad_creatives cr where cr.campaign_id=c.id)) into payload
 from ad_campaigns c where c.id=p_campaign;
 if payload is null then raise exception 'Campaign not found'; end if;
 if p_patch is null then
   delete from ad_campaign_placements where campaign_id=p_campaign and placement_id=p_placement;
   return p_campaign;
 end if;
 select to_jsonb(cp) into current_value from ad_campaign_placements cp where campaign_id=p_campaign and placement_id=p_placement;
 current_value := coalesce(current_value,jsonb_build_object('placement_id',p_placement,'priority',0,'frequency_limit',3,'rotation_seconds',300,'audience','all','active',true,'start_at',null,'end_at',null)) || p_patch || jsonb_build_object('placement_id',p_placement);
 payload := payload || jsonb_build_object('placements',coalesce((select jsonb_agg(to_jsonb(cp)) from ad_campaign_placements cp where cp.campaign_id=p_campaign and cp.placement_id<>p_placement),'[]'::jsonb) || jsonb_build_array(current_value));
 return save_ad_campaign(payload);
end $$;

-- Tables and RPCs are service-role only. Public users go through the API.
do $$ declare t text; begin
 foreach t in array array['ad_campaigns','ad_creatives','ad_placements','ad_campaign_placements','ad_deliveries','ad_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
revoke all on function public.save_ad_campaign(jsonb),public.deliver_ad(text,text,text,uuid),public.record_ad_event(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.change_ad_assignment(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.change_ad_assignment(uuid,uuid,jsonb) to service_role;
grant execute on function public.save_ad_campaign(jsonb),public.deliver_ad(text,text,text,uuid),public.record_ad_event(uuid,uuid,text,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ad-creatives','ad-creatives',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
commit;
