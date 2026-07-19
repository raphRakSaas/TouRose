-- Real OpenAgenda categories ("types d'événements") seeded + exposed on public_events.

insert into public.categories (id, slug, name, color_token, is_active)
values
  ('33333333-3333-3333-3333-333333333303', 'spectacle', 'Spectacle & Musique', '#A94A30', true),
  ('33333333-3333-3333-3333-333333333304', 'visite', 'Visite', '#26525C', true),
  ('33333333-3333-3333-3333-333333333305', 'atelier', 'Stage & Atelier', '#A88B63', true),
  ('33333333-3333-3333-3333-333333333306', 'exposition', 'Exposition', '#8B5EAD', true),
  ('33333333-3333-3333-3333-333333333307', 'cinema', 'Cinéma', '#5D3B77', true),
  ('33333333-3333-3333-3333-333333333308', 'festival', 'Fête & Festival', '#C2410C', true),
  ('33333333-3333-3333-3333-333333333309', 'conference', 'Conférence', '#3F6B74', true),
  ('33333333-3333-3333-3333-333333333310', 'sport', 'Sport', '#2F7D4A', true),
  ('33333333-3333-3333-3333-333333333311', 'marche', 'Foire & Marché', '#B45309', true),
  ('33333333-3333-3333-3333-333333333312', 'congres', 'Congrès & Salon', '#475569', true),
  ('33333333-3333-3333-3333-333333333313', 'reunion-publique', 'Réunion publique', '#64748B', true)
on conflict (id) do update
  set slug = excluded.slug,
      name = excluded.name,
      color_token = excluded.color_token,
      is_active = excluded.is_active;

-- Edge imports run with the service role and need explicit grants to link categories.
grant select on public.categories to service_role;
grant select, insert, update, delete on public.event_categories to service_role;

-- Expose event categories (array of active slugs) on the public read model.
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
  coalesce(event_cats.slugs, array[]::text[]) as categories
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
where event_row.status = 'published';

grant select on public.public_events to anon, authenticated;
