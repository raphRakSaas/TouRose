-- OpenAgenda image previews: public only for tightly scoped OA CDN/source URLs.

drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read
  on public.media_assets
  for select
  to anon, authenticated
  using (
    (
      rights_status = 'allowed'
      or (
        rights_status = 'needs_review'
        and remote_url like 'https://cdn.openagenda.com/%'
        and source_url like 'https://openagenda.com/%'
      )
    )
    and exists (
      select 1
      from public.entity_media link_row
      where link_row.media_id = media_assets.id
        and link_row.entity_type = 'event'
        and exists (
          select 1
          from public.events event_row
          where event_row.id = link_row.entity_id
            and event_row.status = 'published'
        )
    )
  );

drop policy if exists entity_media_public_read on public.entity_media;
create policy entity_media_public_read
  on public.entity_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.media_assets media_row
      where media_row.id = entity_media.media_id
        and (
          media_row.rights_status = 'allowed'
          or (
            media_row.rights_status = 'needs_review'
            and media_row.remote_url like 'https://cdn.openagenda.com/%'
            and media_row.source_url like 'https://openagenda.com/%'
          )
        )
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
  ) as next_ends_at,
  cover_media.remote_url as image_url,
  cover_media.alt_text as image_alt,
  cover_media.attribution_text as image_attribution,
  cover_media.source_url as image_source_url
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
where event_row.status = 'published';

grant select on public.public_events to anon, authenticated;
