-- Phase 1 admin save helpers (lat/lng → PostGIS) + auth seed support note in seed.sql

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

  result_id := coalesce(
    nullif(payload ->> 'id', '')::uuid,
    gen_random_uuid()
  );

  insert into public.places (
    id,
    territory_id,
    slug,
    name,
    summary,
    description,
    place_type,
    location,
    address,
    postal_code,
    city,
    website_url,
    price_type,
    indoor_outdoor,
    status,
    published_at,
    last_verified_at
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
    coalesce(payload ->> 'status', 'draft'),
    case
      when coalesce(payload ->> 'status', 'draft') = 'published'
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

  result_id := coalesce(
    nullif(payload ->> 'id', '')::uuid,
    gen_random_uuid()
  );

  insert into public.events (
    id,
    territory_id,
    place_id,
    slug,
    title,
    summary,
    description,
    location,
    price_type,
    indoor_outdoor,
    official_url,
    status,
    published_at,
    last_verified_at
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
    coalesce(payload ->> 'status', 'draft'),
    case
      when coalesce(payload ->> 'status', 'draft') = 'published'
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
    where event_id = result_id
      and status = 'scheduled';

    insert into public.event_occurrences (
      event_id,
      starts_at,
      ends_at,
      status
    )
    values (
      result_id,
      occurrence_starts,
      occurrence_ends,
      'scheduled'
    );
  end if;

  return result_id;
end;
$$;

revoke all on function public.admin_save_place(jsonb) from public;
revoke all on function public.admin_save_event(jsonb) from public;
grant execute on function public.admin_save_place(jsonb) to authenticated;
grant execute on function public.admin_save_event(jsonb) to authenticated;
