-- Fiches lieux enrichies et galerie média publique.

alter table public.places
  add column if not exists details jsonb not null default '{}'::jsonb;

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
  place_row.last_verified_at,
  place_row.address,
  place_row.description,
  place_row.postal_code,
  place_row.website_url,
  place_row.phone,
  place_row.price_details,
  place_row.recommended_duration_minutes,
  place_row.family_friendly,
  place_row.dog_friendly,
  place_row.accessible,
  place_row.details,
  cover_media.remote_url as image_url,
  cover_media.alt_text as image_alt,
  cover_media.attribution_text as image_attribution,
  cover_media.source_url as image_source_url
from public.places place_row
left join lateral (
  select
    media_row.remote_url,
    media_row.alt_text,
    media_row.attribution_text,
    media_row.source_url
  from public.entity_media link_row
  join public.media_assets media_row on media_row.id = link_row.media_id
  where link_row.entity_type = 'place'
    and link_row.entity_id = place_row.id
    and link_row.is_cover
    and media_row.rights_status in ('allowed', 'needs_review')
  order by link_row.position asc, link_row.created_at asc
  limit 1
) cover_media on true
where place_row.status = 'published';

grant select on public.public_places to anon, authenticated;
