-- RLS + public read surface for published upcoming events

alter table public.territories enable row level security;
alter table public.sources enable row level security;
alter table public.categories enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.place_categories enable row level security;
alter table public.event_categories enable row level security;

create policy territories_public_read
  on public.territories
  for select
  to anon, authenticated
  using (is_active = true);

create policy sources_public_read
  on public.sources
  for select
  to anon, authenticated
  using (is_active = true);

create policy categories_public_read
  on public.categories
  for select
  to anon, authenticated
  using (is_active = true);

create policy places_public_read
  on public.places
  for select
  to anon, authenticated
  using (status = 'published');

create policy events_public_read
  on public.events
  for select
  to anon, authenticated
  using (status = 'published');

create policy event_occurrences_public_read
  on public.event_occurrences
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events event_row
      where event_row.id = event_occurrences.event_id
        and event_row.status = 'published'
    )
  );

create policy place_categories_public_read
  on public.place_categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.places place_row
      where place_row.id = place_categories.place_id
        and place_row.status = 'published'
    )
  );

create policy event_categories_public_read
  on public.event_categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.events event_row
      where event_row.id = event_categories.event_id
        and event_row.status = 'published'
    )
  );

create or replace view public.public_events
with (security_invoker = true)
as
select
  event_row.id,
  event_row.slug,
  event_row.title,
  event_row.summary,
  event_row.place_id,
  extensions.st_y(event_row.location::extensions.geometry) as latitude,
  extensions.st_x(event_row.location::extensions.geometry) as longitude,
  event_row.price_type,
  event_row.indoor_outdoor,
  event_row.status,
  event_row.official_url,
  event_row.last_verified_at,
  (
    select min(occurrence_row.starts_at)
    from public.event_occurrences occurrence_row
    where occurrence_row.event_id = event_row.id
      and occurrence_row.status = 'scheduled'
      and occurrence_row.starts_at >= timezone('utc', now())
  ) as next_starts_at,
  (
    select occurrence_row.ends_at
    from public.event_occurrences occurrence_row
    where occurrence_row.event_id = event_row.id
      and occurrence_row.status = 'scheduled'
      and occurrence_row.starts_at >= timezone('utc', now())
    order by occurrence_row.starts_at asc
    limit 1
  ) as next_ends_at
from public.events event_row
where event_row.status = 'published';

create or replace function public.list_upcoming_public_events(limit_count integer default 20)
returns setof public.public_events
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select *
  from public.public_events
  where next_starts_at is not null
  order by next_starts_at asc
  limit greatest(limit_count, 1);
$$;

grant usage on schema public to anon, authenticated;
grant select on public.territories to anon, authenticated;
grant select on public.sources to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.places to anon, authenticated;
grant select on public.events to anon, authenticated;
grant select on public.event_occurrences to anon, authenticated;
grant select on public.place_categories to anon, authenticated;
grant select on public.event_categories to anon, authenticated;
grant select on public.public_events to anon, authenticated;
grant execute on function public.list_upcoming_public_events(integer) to anon, authenticated;
