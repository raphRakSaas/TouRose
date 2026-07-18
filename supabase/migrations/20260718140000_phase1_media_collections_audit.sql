-- Phase 1 completion: media, collections, audit_logs

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text,
  remote_url text,
  mime_type text,
  width_px integer,
  height_px integer,
  alt_text text,
  author text,
  source_url text,
  license_name text,
  license_url text,
  attribution_text text,
  cache_permission boolean not null default false,
  rights_status text not null default 'unknown',
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint media_assets_rights_status_check check (
    rights_status in ('unknown', 'allowed', 'restricted', 'rejected', 'needs_review')
  ),
  constraint media_assets_has_location check (
    storage_path is not null or remote_url is not null
  )
);

create table public.entity_media (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  position integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint entity_media_entity_type_check check (
    entity_type in ('place', 'event', 'collection')
  ),
  constraint entity_media_unique unique (entity_type, entity_id, media_id)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories (id) on delete restrict,
  slug text not null,
  title text not null,
  summary text,
  description text,
  cover_media_id uuid references public.media_assets (id) on delete set null,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  sort_mode text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint collections_territory_slug_unique unique (territory_id, slug),
  constraint collections_status_check check (
    status in ('draft', 'published', 'archived', 'hidden')
  ),
  constraint collections_sort_mode_check check (
    sort_mode in ('manual', 'date', 'name')
  )
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (collection_id, entity_type, entity_id),
  constraint collection_items_entity_type_check check (
    entity_type in ('place', 'event')
  )
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint audit_logs_action_check check (
    action in (
      'create',
      'update',
      'publish',
      'archive',
      'hide',
      'promote_admin',
      'other'
    )
  )
);

create index entity_media_entity_idx on public.entity_media (entity_type, entity_id);
create index collection_items_entity_idx on public.collection_items (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index collections_status_idx on public.collections (status);

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.entity_media enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.audit_logs enable row level security;

-- Public can read allowed media linked to published content
create policy media_assets_public_read
  on public.media_assets
  for select
  to anon, authenticated
  using (
    rights_status = 'allowed'
    and exists (
      select 1
      from public.entity_media link_row
      where link_row.media_id = media_assets.id
        and (
          (
            link_row.entity_type = 'place'
            and exists (
              select 1 from public.places place_row
              where place_row.id = link_row.entity_id
                and place_row.status = 'published'
            )
          )
          or (
            link_row.entity_type = 'event'
            and exists (
              select 1 from public.events event_row
              where event_row.id = link_row.entity_id
                and event_row.status = 'published'
            )
          )
          or (
            link_row.entity_type = 'collection'
            and exists (
              select 1 from public.collections collection_row
              where collection_row.id = link_row.entity_id
                and collection_row.status = 'published'
            )
          )
        )
    )
  );

create policy media_assets_admin_all
  on public.media_assets
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy entity_media_public_read
  on public.entity_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.media_assets media_row
      where media_row.id = entity_media.media_id
        and media_row.rights_status = 'allowed'
    )
  );

create policy entity_media_admin_all
  on public.entity_media
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy collections_public_read
  on public.collections
  for select
  to anon, authenticated
  using (status = 'published');

create policy collections_admin_all
  on public.collections
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy collection_items_public_read
  on public.collection_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.collections collection_row
      where collection_row.id = collection_items.collection_id
        and collection_row.status = 'published'
    )
  );

create policy collection_items_admin_all
  on public.collection_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy audit_logs_admin_select
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin());

create policy audit_logs_admin_insert
  on public.audit_logs
  for insert
  to authenticated
  with check (public.is_admin());

create or replace view public.public_collections
with (security_invoker = true)
as
select
  collection_row.id,
  collection_row.slug,
  collection_row.title,
  collection_row.summary,
  collection_row.status,
  collection_row.starts_at,
  collection_row.ends_at
from public.collections collection_row
where collection_row.status = 'published';

create or replace function public.list_public_collections(limit_count integer default 20)
returns setof public.public_collections
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.public_collections
  order by title asc
  limit greatest(limit_count, 1);
$$;

create or replace function public.admin_write_audit(
  action_name text,
  entity_type_name text,
  entity_uuid uuid,
  payload_json jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  log_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, payload)
  values (auth.uid(), action_name, entity_type_name, entity_uuid, coalesce(payload_json, '{}'::jsonb))
  returning id into log_id;

  return log_id;
end;
$$;

create or replace function public.get_public_place(place_slug text)
returns setof public.public_places
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select *
  from public.public_places
  where slug = place_slug
  limit 1;
$$;

create or replace function public.get_public_event(event_slug text)
returns setof public.public_events
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select *
  from public.public_events
  where slug = event_slug
  limit 1;
$$;

grant select on public.media_assets to anon, authenticated;
grant select on public.entity_media to anon, authenticated;
grant select on public.collections to anon, authenticated;
grant select on public.collection_items to anon, authenticated;
grant select on public.public_collections to anon, authenticated;
grant execute on function public.list_public_collections(integer) to anon, authenticated;
grant execute on function public.get_public_place(text) to anon, authenticated;
grant execute on function public.get_public_event(text) to anon, authenticated;
grant execute on function public.admin_write_audit(text, text, uuid, jsonb) to authenticated;

grant insert, update, delete on public.media_assets to authenticated;
grant insert, update, delete on public.entity_media to authenticated;
grant insert, update, delete on public.collections to authenticated;
grant insert, update, delete on public.collection_items to authenticated;
grant insert, select on public.audit_logs to authenticated;

create policy sources_admin_all
  on public.sources
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert, update, delete on public.sources to authenticated;

-- Wrap existing admin saves with audit logging
create or replace function public.admin_save_place(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  result_id uuid;
  latitude_value double precision;
  longitude_value double precision;
  location_value extensions.geography(Point, 4326);
  previous_status text;
  next_status text;
  audit_action text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  latitude_value := nullif(payload ->> 'latitude', '')::double precision;
  longitude_value := nullif(payload ->> 'longitude', '')::double precision;

  if latitude_value is not null and longitude_value is not null then
    location_value := extensions.st_setsrid(
      extensions.st_makepoint(longitude_value, latitude_value),
      4326
    )::extensions.geography;
  else
    location_value := null;
  end if;

  result_id := coalesce(nullif(payload ->> 'id', '')::uuid, gen_random_uuid());
  next_status := coalesce(payload ->> 'status', 'draft');

  select status into previous_status from public.places where id = result_id;

  insert into public.places (
    id, territory_id, slug, name, summary, description, place_type, location,
    address, postal_code, city, website_url, price_type, indoor_outdoor, status,
    published_at, last_verified_at
  )
  values (
    result_id,
    (payload ->> 'territory_id')::uuid,
    payload ->> 'slug',
    payload ->> 'name',
    payload ->> 'summary',
    payload ->> 'description',
    payload ->> 'place_type',
    location_value,
    payload ->> 'address',
    payload ->> 'postal_code',
    payload ->> 'city',
    payload ->> 'website_url',
    coalesce(payload ->> 'price_type', 'unknown'),
    coalesce(payload ->> 'indoor_outdoor', 'unknown'),
    next_status,
    case when next_status = 'published'
      then coalesce((payload ->> 'published_at')::timestamptz, timezone('utc', now()))
      else null
    end,
    timezone('utc', now())
  )
  on conflict (id) do update set
    territory_id = excluded.territory_id,
    slug = excluded.slug,
    name = excluded.name,
    summary = excluded.summary,
    description = excluded.description,
    place_type = excluded.place_type,
    location = excluded.location,
    address = excluded.address,
    postal_code = excluded.postal_code,
    city = excluded.city,
    website_url = excluded.website_url,
    price_type = excluded.price_type,
    indoor_outdoor = excluded.indoor_outdoor,
    status = excluded.status,
    published_at = case
      when excluded.status = 'published'
        then coalesce(public.places.published_at, timezone('utc', now()))
      else public.places.published_at
    end,
    last_verified_at = timezone('utc', now()),
    updated_at = timezone('utc', now());

  audit_action := case
    when previous_status is null then 'create'
    when next_status = 'published' and coalesce(previous_status, '') is distinct from 'published' then 'publish'
    when next_status = 'archived' then 'archive'
    when next_status = 'hidden' then 'hide'
    else 'update'
  end;

  perform public.admin_write_audit(audit_action, 'place', result_id, payload);
  return result_id;
end;
$$;

create or replace function public.admin_save_event(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  result_id uuid;
  latitude_value double precision;
  longitude_value double precision;
  location_value extensions.geography(Point, 4326);
  occurrence_starts timestamptz;
  occurrence_ends timestamptz;
  previous_status text;
  next_status text;
  audit_action text;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  latitude_value := nullif(payload ->> 'latitude', '')::double precision;
  longitude_value := nullif(payload ->> 'longitude', '')::double precision;

  if latitude_value is not null and longitude_value is not null then
    location_value := extensions.st_setsrid(
      extensions.st_makepoint(longitude_value, latitude_value),
      4326
    )::extensions.geography;
  else
    location_value := null;
  end if;

  result_id := coalesce(nullif(payload ->> 'id', '')::uuid, gen_random_uuid());
  next_status := coalesce(payload ->> 'status', 'draft');
  select status into previous_status from public.events where id = result_id;

  insert into public.events (
    id, territory_id, place_id, slug, title, summary, description, location,
    price_type, indoor_outdoor, official_url, status, published_at, last_verified_at
  )
  values (
    result_id,
    (payload ->> 'territory_id')::uuid,
    nullif(payload ->> 'place_id', '')::uuid,
    payload ->> 'slug',
    payload ->> 'title',
    payload ->> 'summary',
    payload ->> 'description',
    location_value,
    coalesce(payload ->> 'price_type', 'unknown'),
    coalesce(payload ->> 'indoor_outdoor', 'unknown'),
    nullif(payload ->> 'official_url', ''),
    next_status,
    case when next_status = 'published'
      then coalesce((payload ->> 'published_at')::timestamptz, timezone('utc', now()))
      else null
    end,
    timezone('utc', now())
  )
  on conflict (id) do update set
    territory_id = excluded.territory_id,
    place_id = excluded.place_id,
    slug = excluded.slug,
    title = excluded.title,
    summary = excluded.summary,
    description = excluded.description,
    location = excluded.location,
    price_type = excluded.price_type,
    indoor_outdoor = excluded.indoor_outdoor,
    official_url = excluded.official_url,
    status = excluded.status,
    published_at = case
      when excluded.status = 'published'
        then coalesce(public.events.published_at, timezone('utc', now()))
      else public.events.published_at
    end,
    last_verified_at = timezone('utc', now()),
    updated_at = timezone('utc', now());

  occurrence_starts := nullif(payload ->> 'starts_at', '')::timestamptz;
  occurrence_ends := nullif(payload ->> 'ends_at', '')::timestamptz;

  if occurrence_starts is not null then
    delete from public.event_occurrences
    where event_id = result_id and status = 'scheduled';

    insert into public.event_occurrences (event_id, starts_at, ends_at, status)
    values (result_id, occurrence_starts, occurrence_ends, 'scheduled');
  end if;

  audit_action := case
    when previous_status is null then 'create'
    when next_status = 'published' and coalesce(previous_status, '') is distinct from 'published' then 'publish'
    when next_status = 'archived' then 'archive'
    when next_status = 'hidden' then 'hide'
    else 'update'
  end;

  perform public.admin_write_audit(audit_action, 'event', result_id, payload);
  return result_id;
end;
$$;

revoke all on function public.admin_save_place(jsonb) from public;
revoke all on function public.admin_save_event(jsonb) from public;
grant execute on function public.admin_save_place(jsonb) to authenticated;
grant execute on function public.admin_save_event(jsonb) to authenticated;
