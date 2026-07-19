-- Déduplication des lieux :
-- 1. Fonction de normalisation de nom (accents, casse, espaces).
-- 2. import_upsert_event rapproche les lieux par nom normalisé + proximité
--    avant de créer une nouvelle ligne (les uid OpenAgenda varient pour un
--    même lieu physique, et l'ancien schéma d'external_id était le slug du nom).
-- 3. Fusion des doublons existants : repointage des événements, médias,
--    liens externes, catégories et collections vers le lieu canonique.

create or replace function public.normalize_place_name(place_name text)
returns text
language sql
immutable
as $$
  select lower(
    extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(trim(place_name), ''))
  );
$$;

revoke all on function public.normalize_place_name(text) from public;
grant execute on function public.normalize_place_name(text) to anon, authenticated, service_role;

create or replace function public.import_upsert_event(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  source_uuid uuid;
  external_id_value text;
  existing_record public.external_records%rowtype;
  event_uuid uuid;
  place_uuid uuid;
  place_payload jsonb;
  place_latitude double precision;
  place_longitude double precision;
  place_location_value extensions.geography(Point, 4326);
  title_value text;
  slug_value text;
  summary_value text;
  description_value text;
  status_value text;
  price_type_value text;
  indoor_outdoor_value text;
  official_url_value text;
  latitude_value double precision;
  longitude_value double precision;
  location_value extensions.geography(Point, 4326);
  occurrence_item jsonb;
  occurrence_starts timestamptz;
  occurrence_ends timestamptz;
  was_created boolean := false;
  territory_uuid uuid;
begin
  if not public.is_service_role() and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  source_uuid := (payload ->> 'source_id')::uuid;
  external_id_value := payload ->> 'external_id';
  territory_uuid := coalesce(
    nullif(payload ->> 'territory_id', '')::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid
  );

  if source_uuid is null or external_id_value is null or length(trim(external_id_value)) = 0 then
    raise exception 'source_id and external_id are required';
  end if;

  select *
  into existing_record
  from public.external_records
  where source_id = source_uuid
    and entity_type = 'event'
    and external_id = external_id_value;

  if found and existing_record.payload_hash = (payload ->> 'payload_hash') then
    update public.external_records
    set
      last_seen_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = existing_record.id;

    return jsonb_build_object(
      'entity_id', existing_record.entity_id,
      'action', 'skipped',
      'external_id', external_id_value
    );
  end if;

  event_uuid := coalesce(existing_record.entity_id, gen_random_uuid());
  was_created := existing_record.entity_id is null;

  place_payload := payload -> 'place';
  if place_payload is not null and place_payload <> 'null'::jsonb then
    place_latitude := nullif(place_payload ->> 'latitude', '')::double precision;
    place_longitude := nullif(place_payload ->> 'longitude', '')::double precision;
    if place_latitude is not null and place_longitude is not null then
      place_location_value := extensions.st_setsrid(
        extensions.st_makepoint(place_longitude, place_latitude),
        4326
      )::extensions.geography;
    else
      place_location_value := null;
    end if;

    place_uuid := coalesce(
      nullif(place_payload ->> 'id', '')::uuid,
      (
        select place_link.entity_id
        from public.external_records place_link
        where place_link.source_id = source_uuid
          and place_link.entity_type = 'place'
          and place_link.external_id = coalesce(place_payload ->> 'external_id', '')
        limit 1
      ),
      -- Anti-doublon : même nom normalisé sur le même territoire, et si les
      -- deux côtés ont des coordonnées, à moins de 500 m l'un de l'autre.
      (
        select existing_place.id
        from public.places existing_place
        where existing_place.territory_id = territory_uuid
          and nullif(public.normalize_place_name(place_payload ->> 'name'), '') is not null
          and public.normalize_place_name(existing_place.name)
            = public.normalize_place_name(place_payload ->> 'name')
          and (
            existing_place.location is null
            or place_location_value is null
            or extensions.st_dwithin(existing_place.location, place_location_value, 500)
          )
        order by existing_place.created_at
        limit 1
      ),
      gen_random_uuid()
    );

    insert into public.places (
      id,
      territory_id,
      slug,
      name,
      summary,
      place_type,
      location,
      address,
      city,
      price_type,
      indoor_outdoor,
      status,
      published_at,
      last_verified_at
    )
    values (
      place_uuid,
      territory_uuid,
      coalesce(nullif(place_payload ->> 'slug', ''), 'lieu-' || left(place_uuid::text, 8)),
      coalesce(nullif(place_payload ->> 'name', ''), 'Lieu importé'),
      place_payload ->> 'summary',
      coalesce(nullif(place_payload ->> 'place_type', ''), 'cultural_venue'),
      place_location_value,
      place_payload ->> 'address',
      coalesce(place_payload ->> 'city', 'Toulouse'),
      coalesce(place_payload ->> 'price_type', 'unknown'),
      coalesce(place_payload ->> 'indoor_outdoor', 'unknown'),
      coalesce(place_payload ->> 'status', 'published'),
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (id) do update set
      name = excluded.name,
      summary = coalesce(excluded.summary, public.places.summary),
      location = coalesce(excluded.location, public.places.location),
      address = coalesce(excluded.address, public.places.address),
      city = coalesce(excluded.city, public.places.city),
      last_verified_at = timezone('utc', now()),
      updated_at = timezone('utc', now());

    if nullif(place_payload ->> 'external_id', '') is not null then
      insert into public.external_records (
        source_id,
        entity_type,
        entity_id,
        external_id,
        external_url,
        payload,
        payload_hash,
        source_updated_at
      )
      values (
        source_uuid,
        'place',
        place_uuid,
        place_payload ->> 'external_id',
        place_payload ->> 'external_url',
        coalesce(place_payload, '{}'::jsonb),
        coalesce(place_payload ->> 'payload_hash', payload ->> 'payload_hash'),
        nullif(payload ->> 'source_updated_at', '')::timestamptz
      )
      on conflict (source_id, entity_type, external_id) do update set
        entity_id = excluded.entity_id,
        payload = excluded.payload,
        payload_hash = excluded.payload_hash,
        last_seen_at = timezone('utc', now()),
        last_imported_at = timezone('utc', now()),
        updated_at = timezone('utc', now());
    end if;
  else
    place_uuid := nullif(payload ->> 'place_id', '')::uuid;
  end if;

  title_value := public.apply_editorial_override(
    'event', event_uuid, 'title', to_jsonb(payload ->> 'title')
  ) #>> '{}';
  slug_value := public.apply_editorial_override(
    'event', event_uuid, 'slug', to_jsonb(payload ->> 'slug')
  ) #>> '{}';
  summary_value := public.apply_editorial_override(
    'event', event_uuid, 'summary', to_jsonb(payload ->> 'summary')
  ) #>> '{}';
  description_value := public.apply_editorial_override(
    'event', event_uuid, 'description', to_jsonb(payload ->> 'description')
  ) #>> '{}';
  status_value := coalesce(
    public.apply_editorial_override(
      'event', event_uuid, 'status', to_jsonb(payload ->> 'status')
    ) #>> '{}',
    'published'
  );
  price_type_value := coalesce(payload ->> 'price_type', 'unknown');
  indoor_outdoor_value := coalesce(payload ->> 'indoor_outdoor', 'unknown');
  official_url_value := public.apply_editorial_override(
    'event', event_uuid, 'official_url', to_jsonb(payload ->> 'official_url')
  ) #>> '{}';

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
    event_uuid,
    territory_uuid,
    place_uuid,
    coalesce(nullif(slug_value, ''), 'event-' || left(event_uuid::text, 8)),
    coalesce(nullif(title_value, ''), 'Événement importé'),
    nullif(summary_value, ''),
    nullif(description_value, ''),
    location_value,
    price_type_value,
    indoor_outdoor_value,
    nullif(official_url_value, ''),
    status_value,
    case when status_value = 'published' then timezone('utc', now()) else null end,
    timezone('utc', now())
  )
  on conflict (id) do update set
    place_id = coalesce(excluded.place_id, public.events.place_id),
    slug = excluded.slug,
    title = excluded.title,
    summary = excluded.summary,
    description = excluded.description,
    location = coalesce(excluded.location, public.events.location),
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

  delete from public.event_occurrences
  where event_id = event_uuid
    and status = 'scheduled';

  for occurrence_item in
    select * from jsonb_array_elements(coalesce(payload -> 'occurrences', '[]'::jsonb))
  loop
    occurrence_starts := nullif(occurrence_item ->> 'starts_at', '')::timestamptz;
    occurrence_ends := nullif(occurrence_item ->> 'ends_at', '')::timestamptz;
    if occurrence_starts is null then
      continue;
    end if;

    insert into public.event_occurrences (
      event_id,
      starts_at,
      ends_at,
      status
    )
    values (
      event_uuid,
      occurrence_starts,
      occurrence_ends,
      'scheduled'
    );
  end loop;

  insert into public.external_records (
    source_id,
    entity_type,
    entity_id,
    external_id,
    external_url,
    payload,
    payload_hash,
    source_updated_at
  )
  values (
    source_uuid,
    'event',
    event_uuid,
    external_id_value,
    payload ->> 'external_url',
    coalesce(payload -> 'raw_payload', '{}'::jsonb),
    payload ->> 'payload_hash',
    nullif(payload ->> 'source_updated_at', '')::timestamptz
  )
  on conflict (source_id, entity_type, external_id) do update set
    entity_id = excluded.entity_id,
    external_url = excluded.external_url,
    payload = excluded.payload,
    payload_hash = excluded.payload_hash,
    last_seen_at = timezone('utc', now()),
    last_imported_at = timezone('utc', now()),
    source_updated_at = excluded.source_updated_at,
    updated_at = timezone('utc', now());

  return jsonb_build_object(
    'entity_id', event_uuid,
    'action', case when was_created then 'created' else 'updated' end,
    'external_id', external_id_value,
    'place_id', place_uuid
  );
end;
$$;

revoke all on function public.import_upsert_event(jsonb) from public;
grant execute on function public.import_upsert_event(jsonb) to service_role;
grant execute on function public.import_upsert_event(jsonb) to authenticated;

-- Fusion des doublons existants : pour chaque groupe de lieux portant le même
-- nom normalisé sur le même territoire, on garde le lieu le plus riche
-- (le plus d'événements liés, puis détails/description, puis le plus ancien)
-- et on repointe toutes les références avant de supprimer les doublons.
do $$
declare
  duplicate_group record;
  canonical_place_id uuid;
  duplicate_place_id uuid;
begin
  for duplicate_group in
    select
      territory_id,
      public.normalize_place_name(name) as normalized_name,
      array_agg(id) as place_ids
    from public.places
    where nullif(public.normalize_place_name(name), '') is not null
    group by territory_id, public.normalize_place_name(name)
    having count(*) > 1
  loop
    select place_row.id
    into canonical_place_id
    from public.places place_row
    where place_row.id = any(duplicate_group.place_ids)
    order by
      (select count(*) from public.events event_row where event_row.place_id = place_row.id) desc,
      (place_row.details <> '{}'::jsonb) desc,
      (place_row.description is not null) desc,
      place_row.created_at asc
    limit 1;

    foreach duplicate_place_id in array duplicate_group.place_ids loop
      if duplicate_place_id = canonical_place_id then
        continue;
      end if;

      -- Compléter le lieu canonique avec les champs manquants du doublon.
      update public.places canonical_place
      set
        summary = coalesce(canonical_place.summary, duplicate_place.summary),
        description = coalesce(canonical_place.description, duplicate_place.description),
        location = coalesce(canonical_place.location, duplicate_place.location),
        address = coalesce(canonical_place.address, duplicate_place.address),
        postal_code = coalesce(canonical_place.postal_code, duplicate_place.postal_code),
        city = coalesce(canonical_place.city, duplicate_place.city),
        website_url = coalesce(canonical_place.website_url, duplicate_place.website_url),
        phone = coalesce(canonical_place.phone, duplicate_place.phone),
        details = case
          when canonical_place.details = '{}'::jsonb then duplicate_place.details
          else canonical_place.details
        end,
        updated_at = timezone('utc', now())
      from public.places duplicate_place
      where canonical_place.id = canonical_place_id
        and duplicate_place.id = duplicate_place_id;

      update public.events
      set place_id = canonical_place_id
      where place_id = duplicate_place_id;

      update public.external_records
      set
        entity_id = canonical_place_id,
        updated_at = timezone('utc', now())
      where entity_type = 'place'
        and entity_id = duplicate_place_id;

      delete from public.entity_media duplicate_media
      where duplicate_media.entity_type = 'place'
        and duplicate_media.entity_id = duplicate_place_id
        and exists (
          select 1
          from public.entity_media canonical_media
          where canonical_media.entity_type = 'place'
            and canonical_media.entity_id = canonical_place_id
            and canonical_media.media_id = duplicate_media.media_id
        );

      update public.entity_media
      set entity_id = canonical_place_id
      where entity_type = 'place'
        and entity_id = duplicate_place_id;

      delete from public.place_categories duplicate_link
      where duplicate_link.place_id = duplicate_place_id
        and exists (
          select 1
          from public.place_categories canonical_link
          where canonical_link.place_id = canonical_place_id
            and canonical_link.category_id = duplicate_link.category_id
        );

      update public.place_categories
      set place_id = canonical_place_id
      where place_id = duplicate_place_id;

      delete from public.collection_items duplicate_item
      where duplicate_item.entity_type = 'place'
        and duplicate_item.entity_id = duplicate_place_id
        and exists (
          select 1
          from public.collection_items canonical_item
          where canonical_item.entity_type = 'place'
            and canonical_item.entity_id = canonical_place_id
            and canonical_item.collection_id = duplicate_item.collection_id
        );

      update public.collection_items
      set entity_id = canonical_place_id
      where entity_type = 'place'
        and entity_id = duplicate_place_id;

      delete from public.editorial_overrides duplicate_override
      where duplicate_override.entity_type = 'place'
        and duplicate_override.entity_id = duplicate_place_id
        and exists (
          select 1
          from public.editorial_overrides canonical_override
          where canonical_override.entity_type = 'place'
            and canonical_override.entity_id = canonical_place_id
            and canonical_override.field_name = duplicate_override.field_name
        );

      update public.editorial_overrides
      set entity_id = canonical_place_id
      where entity_type = 'place'
        and entity_id = duplicate_place_id;

      delete from public.places
      where id = duplicate_place_id;
    end loop;
  end loop;
end;
$$;
