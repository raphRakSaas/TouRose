-- Phase 1: public places view, catalog search, admin role helpers + write RLS

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

create or replace view public.public_places
with (security_invoker = true)
as
select
  place_row.id,
  place_row.slug,
  place_row.name,
  place_row.summary,
  place_row.place_type,
  extensions.st_y(place_row.location::extensions.geometry) as latitude,
  extensions.st_x(place_row.location::extensions.geometry) as longitude,
  place_row.city,
  place_row.price_type,
  place_row.indoor_outdoor,
  place_row.status,
  place_row.last_verified_at
from public.places place_row
where place_row.status = 'published';

create or replace function public.list_public_places(limit_count integer default 50)
returns setof public.public_places
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select *
  from public.public_places
  order by name asc
  limit greatest(limit_count, 1);
$$;

create or replace function public.search_public_catalog(
  search_query text,
  result_limit integer default 20
)
returns table (
  entity_type text,
  id uuid,
  slug text,
  title text,
  summary text,
  rank real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with normalized as (
    select nullif(trim(search_query), '') as query_text
  ),
  event_hits as (
    select
      'event'::text as entity_type,
      event_row.id,
      event_row.slug,
      event_row.title,
      event_row.summary,
      greatest(
        similarity(
          extensions.unaccent(lower(event_row.title)),
          extensions.unaccent(lower((select query_text from normalized)))
        ),
        similarity(
          extensions.unaccent(lower(coalesce(event_row.summary, ''))),
          extensions.unaccent(lower((select query_text from normalized)))
        )
      ) as rank
    from public.events event_row
    cross join normalized
    where event_row.status = 'published'
      and normalized.query_text is not null
      and (
        extensions.unaccent(lower(event_row.title))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(coalesce(event_row.summary, '')))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(event_row.title))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
        or extensions.unaccent(lower(coalesce(event_row.summary, '')))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
      )
  ),
  place_hits as (
    select
      'place'::text as entity_type,
      place_row.id,
      place_row.slug,
      place_row.name as title,
      place_row.summary,
      greatest(
        similarity(
          extensions.unaccent(lower(place_row.name)),
          extensions.unaccent(lower((select query_text from normalized)))
        ),
        similarity(
          extensions.unaccent(lower(coalesce(place_row.summary, ''))),
          extensions.unaccent(lower((select query_text from normalized)))
        )
      ) as rank
    from public.places place_row
    cross join normalized
    where place_row.status = 'published'
      and normalized.query_text is not null
      and (
        extensions.unaccent(lower(place_row.name))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(coalesce(place_row.summary, '')))
          % extensions.unaccent(lower(normalized.query_text))
        or extensions.unaccent(lower(place_row.name))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
        or extensions.unaccent(lower(coalesce(place_row.summary, '')))
          like '%' || extensions.unaccent(lower(normalized.query_text)) || '%'
      )
  )
  select *
  from (
    select * from event_hits
    union all
    select * from place_hits
  ) catalog_hits
  order by rank desc, title asc
  limit greatest(result_limit, 1);
$$;

-- Admin can read drafts / manage catalog rows
create policy places_admin_select
  on public.places
  for select
  to authenticated
  using (public.is_admin());

create policy places_admin_insert
  on public.places
  for insert
  to authenticated
  with check (public.is_admin());

create policy places_admin_update
  on public.places
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy places_admin_delete
  on public.places
  for delete
  to authenticated
  using (public.is_admin());

create policy events_admin_select
  on public.events
  for select
  to authenticated
  using (public.is_admin());

create policy events_admin_insert
  on public.events
  for insert
  to authenticated
  with check (public.is_admin());

create policy events_admin_update
  on public.events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy events_admin_delete
  on public.events
  for delete
  to authenticated
  using (public.is_admin());

create policy event_occurrences_admin_select
  on public.event_occurrences
  for select
  to authenticated
  using (public.is_admin());

create policy event_occurrences_admin_insert
  on public.event_occurrences
  for insert
  to authenticated
  with check (public.is_admin());

create policy event_occurrences_admin_update
  on public.event_occurrences
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy event_occurrences_admin_delete
  on public.event_occurrences
  for delete
  to authenticated
  using (public.is_admin());

create policy categories_admin_all
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy territories_admin_all
  on public.territories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.public_places to anon, authenticated;
grant execute on function public.list_public_places(integer) to anon, authenticated;
grant execute on function public.search_public_catalog(text, integer) to anon, authenticated;

grant insert, update, delete on public.places to authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert, update, delete on public.event_occurrences to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.territories to authenticated;
