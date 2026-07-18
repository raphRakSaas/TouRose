-- TouRose initial schema: extensions + vertical slice
-- territories, sources, places, events, event_occurrences, categories

create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- pg_cron may be unavailable on some local images; enable when present.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when others then
    raise notice 'pg_cron unavailable in this environment: %', sqlerrm;
end
$$;

create schema if not exists private;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'Europe/Paris',
  boundary extensions.geography(MultiPolygon, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null,
  base_url text,
  license_name text,
  license_url text,
  attribution_template text,
  terms_url text,
  is_active boolean not null default true,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint sources_kind_check check (kind in ('open_data', 'api', 'editorial', 'other'))
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories (id) on delete set null,
  icon text,
  color_token text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories (id) on delete restrict,
  slug text not null,
  name text not null,
  summary text,
  description text,
  place_type text not null,
  location extensions.geography(Point, 4326),
  address text,
  postal_code text,
  city text,
  website_url text,
  phone text,
  price_type text not null default 'unknown',
  price_details text,
  indoor_outdoor text not null default 'unknown',
  recommended_duration_minutes integer,
  family_friendly boolean,
  dog_friendly boolean,
  accessible boolean,
  status text not null default 'draft',
  published_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint places_territory_slug_unique unique (territory_id, slug),
  constraint places_place_type_check check (
    place_type in (
      'monument',
      'museum',
      'square',
      'park',
      'walk',
      'viewpoint',
      'activity',
      'cultural_venue',
      'historical_site',
      'permanent_tip'
    )
  ),
  constraint places_price_type_check check (
    price_type in ('free', 'paid', 'donation', 'unknown')
  ),
  constraint places_indoor_outdoor_check check (
    indoor_outdoor in ('indoor', 'outdoor', 'mixed', 'unknown')
  ),
  constraint places_status_check check (
    status in (
      'draft',
      'published',
      'temporarily_closed',
      'permanently_closed',
      'archived',
      'hidden'
    )
  )
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid not null references public.territories (id) on delete restrict,
  place_id uuid references public.places (id) on delete set null,
  slug text not null,
  title text not null,
  summary text,
  description text,
  location extensions.geography(Point, 4326),
  price_type text not null default 'unknown',
  price_details text,
  booking_url text,
  official_url text,
  indoor_outdoor text not null default 'unknown',
  family_friendly boolean,
  accessible boolean,
  status text not null default 'draft',
  published_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_territory_slug_unique unique (territory_id, slug),
  constraint events_price_type_check check (
    price_type in ('free', 'paid', 'donation', 'unknown')
  ),
  constraint events_indoor_outdoor_check check (
    indoor_outdoor in ('indoor', 'outdoor', 'mixed', 'unknown')
  ),
  constraint events_status_check check (
    status in ('draft', 'published', 'cancelled', 'postponed', 'archived', 'hidden')
  )
);

create table public.event_occurrences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/Paris',
  doors_at timestamptz,
  status text not null default 'scheduled',
  booking_status text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint event_occurrences_status_check check (
    status in ('scheduled', 'cancelled', 'postponed', 'completed')
  ),
  constraint event_occurrences_booking_status_check check (
    booking_status in ('unknown', 'open', 'sold_out', 'cancelled')
  ),
  constraint event_occurrences_ends_after_starts check (
    ends_at is null or ends_at >= starts_at
  )
);

create table public.place_categories (
  place_id uuid not null references public.places (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (place_id, category_id)
);

create table public.event_categories (
  event_id uuid not null references public.events (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (event_id, category_id)
);

create index places_location_gix on public.places using gist (location);
create index events_location_gix on public.events using gist (location);
create index places_status_idx on public.places (status);
create index events_status_idx on public.events (status);
create index event_occurrences_starts_at_idx on public.event_occurrences (starts_at);
create index event_occurrences_event_id_idx on public.event_occurrences (event_id);
create index places_name_trgm_idx on public.places using gin (name extensions.gin_trgm_ops);
create index events_title_trgm_idx on public.events using gin (title extensions.gin_trgm_ops);
create index places_published_partial_idx
  on public.places (territory_id, published_at)
  where status = 'published';
create index events_published_partial_idx
  on public.events (territory_id, published_at)
  where status = 'published';
create index event_occurrences_future_partial_idx
  on public.event_occurrences (starts_at)
  where status = 'scheduled';

create trigger territories_set_updated_at
  before update on public.territories
  for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
  before update on public.sources
  for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger event_occurrences_set_updated_at
  before update on public.event_occurrences
  for each row execute function public.set_updated_at();
