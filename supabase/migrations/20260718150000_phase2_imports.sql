-- Phase 2: import pipeline tables, RLS, and service upsert RPC

create table public.external_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  external_id text not null,
  external_url text,
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  last_imported_at timestamptz not null default timezone('utc', now()),
  source_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint external_records_entity_type_check check (
    entity_type in ('event', 'place')
  ),
  constraint external_records_source_entity_external_unique unique (
    source_id,
    entity_type,
    external_id
  )
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  status text not null default 'running',
  correlation_id text not null,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  fetched_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint import_runs_status_check check (
    status in ('running', 'succeeded', 'failed', 'partial')
  )
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs (id) on delete cascade,
  external_id text,
  error_code text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_errors_error_code_check check (
    error_code in (
      'validation',
      'normalize',
      'upsert',
      'possible_duplicate',
      'media_rights',
      'other'
    )
  )
);

create table public.editorial_overrides (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  value jsonb not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint editorial_overrides_entity_type_check check (
    entity_type in ('event', 'place')
  ),
  constraint editorial_overrides_entity_field_unique unique (
    entity_type,
    entity_id,
    field_name
  )
);

create index external_records_entity_idx
  on public.external_records (entity_type, entity_id);
create index external_records_source_idx
  on public.external_records (source_id, last_imported_at desc);
create index import_runs_source_started_idx
  on public.import_runs (source_id, started_at desc);
create index import_errors_run_idx
  on public.import_errors (import_run_id, created_at desc);
create index editorial_overrides_entity_idx
  on public.editorial_overrides (entity_type, entity_id);

create trigger external_records_set_updated_at
  before update on public.external_records
  for each row execute function public.set_updated_at();

create trigger import_runs_set_updated_at
  before update on public.import_runs
  for each row execute function public.set_updated_at();

create trigger editorial_overrides_set_updated_at
  before update on public.editorial_overrides
  for each row execute function public.set_updated_at();

alter table public.external_records enable row level security;
alter table public.import_runs enable row level security;
alter table public.import_errors enable row level security;
alter table public.editorial_overrides enable row level security;

-- Admin read (service_role bypasses RLS for pipeline writes)
create policy external_records_admin_select
  on public.external_records
  for select
  to authenticated
  using (public.is_admin());

create policy import_runs_admin_select
  on public.import_runs
  for select
  to authenticated
  using (public.is_admin());

create policy import_errors_admin_select
  on public.import_errors
  for select
  to authenticated
  using (public.is_admin());

create policy editorial_overrides_admin_all
  on public.editorial_overrides
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.external_records to authenticated;
grant select on public.import_runs to authenticated;
grant select on public.import_errors to authenticated;
grant select, insert, update, delete on public.editorial_overrides to authenticated;

grant select, insert, update, delete on public.external_records to service_role;
grant select, insert, update, delete on public.import_runs to service_role;
grant select, insert, update, delete on public.import_errors to service_role;
grant select, insert, update, delete on public.editorial_overrides to service_role;
grant select, insert, update, delete on public.places to service_role;
grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.event_occurrences to service_role;

create or replace function public.is_service_role()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.role() = 'service_role', false);
$$;

revoke all on function public.is_service_role() from public;
grant execute on function public.is_service_role() to authenticated, anon, service_role;

-- import_upsert_event calls is_admin(); service_role must be able to execute it
grant execute on function public.is_admin() to service_role;

create or replace function public.apply_editorial_override(
  entity_type_name text,
  entity_uuid uuid,
  field_name_value text,
  incoming_value jsonb
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select override_row.value
      from public.editorial_overrides override_row
      where override_row.entity_type = entity_type_name
        and override_row.entity_id = entity_uuid
        and override_row.field_name = field_name_value
      limit 1
    ),
    incoming_value
  );
$$;

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
      case
        when nullif(place_payload ->> 'latitude', '') is not null
          and nullif(place_payload ->> 'longitude', '') is not null
          then extensions.st_setsrid(
            extensions.st_makepoint(
              (place_payload ->> 'longitude')::double precision,
              (place_payload ->> 'latitude')::double precision
            ),
            4326
          )::extensions.geography
        else null
      end,
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

revoke all on function public.apply_editorial_override(text, uuid, text, jsonb) from public;
grant execute on function public.apply_editorial_override(text, uuid, text, jsonb) to service_role;
grant execute on function public.apply_editorial_override(text, uuid, text, jsonb) to authenticated;
