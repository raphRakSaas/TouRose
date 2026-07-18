-- Avoid reciprocal media_assets <-> entity_media policy recursion.
-- Public rows remain limited to approved media or the narrowly scoped OpenAgenda preview exception.
drop policy if exists media_assets_public_read on public.media_assets;
create policy media_assets_public_read
  on public.media_assets
  for select
  to anon, authenticated
  using (
    rights_status = 'allowed'
    or (
      rights_status = 'needs_review'
      and remote_url like 'https://cdn.openagenda.com/%'
      and source_url like 'https://openagenda.com/%'
    )
  );
