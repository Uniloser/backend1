-- Apply after discovery.sql. Existing stories remain non-AI unless their author marks them.
begin;

alter table public.stories
  add column if not exists is_ai_generated boolean not null default false;

create or replace function public.sync_ai_generated_story_tag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.tags := coalesce(new.tags, '{}'::text[]);
  new.tags := array(
    select tag
    from unnest(new.tags) with ordinality as existing_tag(tag, ord)
    where lower(tag) <> 'ai-generated'
    order by ord
  );

  if new.is_ai_generated then
    new.tags := array_append(new.tags, 'AI-generated');
  end if;

  return new;
end;
$$;

drop trigger if exists sync_ai_generated_story_tag on public.stories;
create trigger sync_ai_generated_story_tag
before insert or update of is_ai_generated, tags on public.stories
for each row execute function public.sync_ai_generated_story_tag();

alter table public.user_discovery_preferences
  alter column preferences set default '{"genres":[],"tags":[],"allowMature":false,"showAiGenerated":true}'::jsonb;

create or replace view public.discovery_eligible as
select s.id, s.author_id, s.title, s.description, s.cover_url, s.genre, s.genre_id,
 coalesce(s.tags,'{}'::text[]) tags, s.status, s.created_at, s.updated_at, s.view_count, s.content_type,
 s.visibility, s.moderation_status, s.is_mature, s.is_complete, coalesce(s.published_at,s.created_at) published_at,
 s.last_chapter_published_at, s.chapters_published, true author_active,
 jsonb_build_object('id',u.id,'username',u.username,'display_name',u.display_name,'avatar_url',u.avatar_url,'is_alpha',u.is_alpha) author,
 coalesce(d.metrics,'{}'::jsonb) metrics,
 d.trending_score, d.rising_score, d.hidden_gem_score, d.quality_score,
 s.is_ai_generated
from public.stories s
join public.users u on u.id=s.author_id
join auth.users a on a.id=u.id
left join public.story_discovery_stats d on d.story_id=s.id
where s.status='published'
 and s.visibility='public'
 and s.moderation_status='approved'
 and s.chapters_published>0
 and (a.banned_until is null or a.banned_until<=now())
 and a.deleted_at is null;

revoke all on public.discovery_eligible from public, anon, authenticated;
grant select on public.discovery_eligible to service_role;

commit;
