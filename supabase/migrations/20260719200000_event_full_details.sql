-- Détails complets OpenAgenda sur la fiche événement :
-- - colonne events.details (conditions/tarifs, accessibilité, âge, inscription, mots-clés…)
-- - vue public_events : + details + occurrences à venir (jusqu'à 20).

alter table public.events
  add column if not exists details jsonb not null default '{}'::jsonb;

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
  ) as next_ends_at,
  cover_media.remote_url as image_url,
  cover_media.alt_text as image_alt,
  cover_media.attribution_text as image_attribution,
  cover_media.source_url as image_source_url,
  coalesce(event_cats.slugs, array[]::text[]) as categories,
  event_row.description,
  event_row.details,
  coalesce(upcoming.occurrences, '[]'::jsonb) as upcoming_occurrences
from public.events event_row
left join lateral (
  select media_row.remote_url, media_row.alt_text, media_row.attribution_text, media_row.source_url
  from public.entity_media link_row
  join public.media_assets media_row on media_row.id = link_row.media_id
  where link_row.entity_type = 'event'
    and link_row.entity_id = event_row.id
    and link_row.is_cover
  order by link_row.position asc, link_row.created_at asc
  limit 1
) cover_media on true
left join lateral (
  select array_agg(category_row.slug order by category_row.slug) as slugs
  from public.event_categories link_row
  join public.categories category_row on category_row.id = link_row.category_id
  where link_row.event_id = event_row.id
    and category_row.is_active
) event_cats on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object('starts_at', limited.starts_at, 'ends_at', limited.ends_at)
    order by limited.starts_at
  ) as occurrences
  from (
    select occurrence_row.starts_at, occurrence_row.ends_at
    from public.event_occurrences occurrence_row
    where occurrence_row.event_id = event_row.id
      and occurrence_row.status = 'scheduled'
      and occurrence_row.starts_at >= timezone('utc', now())
    order by occurrence_row.starts_at asc
    limit 20
  ) limited
) upcoming on true
where event_row.status = 'published';

grant select on public.public_events to anon, authenticated;
