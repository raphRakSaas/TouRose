-- Edge imports use the service role and need explicit table grants in addition to RLS bypass.
grant select, insert, update, delete on public.media_assets to service_role;
grant select, insert, update, delete on public.entity_media to service_role;
