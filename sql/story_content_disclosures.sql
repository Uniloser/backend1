alter table public.stories
  add column if not exists is_ai_assisted boolean not null default false,
  add column if not exists is_ai_generated boolean not null default false,
  add column if not exists content_warnings text[] not null default '{}';

create or replace function public.sync_story_disclosures()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  i integer;
begin
  new.tags := coalesce(new.tags, '{}'::text[]);
  new.content_warnings := coalesce(new.content_warnings, '{}'::text[]);

  new.tags := array(
    select tag
    from unnest(new.tags) with ordinality as existing_tag(tag, ord)
    where lower(tag) <> 'ai-assisted'
      and lower(tag) <> 'ai-generated'
      and lower(tag) not like 'content-warning:%'
    order by ord
  );

  if new.is_ai_assisted then
    new.tags := array_append(new.tags, 'AI-assisted');
  end if;

  if new.is_ai_generated then
    new.tags := array_append(new.tags, 'AI-generated');
  end if;

  if coalesce(array_length(new.content_warnings, 1), 0) > 0 then
    for i in 1..array_length(new.content_warnings, 1) loop
      new.tags := array_append(
        new.tags,
        'content-warning:' || replace(lower(new.content_warnings[i]), '_', '-')
      );
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_story_disclosures on public.stories;
create trigger sync_story_disclosures
before insert or update of is_ai_assisted, is_ai_generated, content_warnings, tags
on public.stories
for each row execute function public.sync_story_disclosures();