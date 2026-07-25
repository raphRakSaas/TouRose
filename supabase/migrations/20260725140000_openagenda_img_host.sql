-- OpenAgenda API now serves images from img.openagenda.com (not only cdn.openagenda.com).

drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read
  on public.media_assets
  for select
  to anon, authenticated
  using (
    rights_status = 'allowed'
    or (
      rights_status = 'needs_review'
      and (
        remote_url like 'https://cdn.openagenda.com/%'
        or remote_url like 'https://img.openagenda.com/%'
      )
      and source_url like 'https://openagenda.com/%'
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
            and (
              media_row.remote_url like 'https://cdn.openagenda.com/%'
              or media_row.remote_url like 'https://img.openagenda.com/%'
            )
            and media_row.source_url like 'https://openagenda.com/%'
          )
        )
    )
  );
