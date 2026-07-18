begin;
select plan(3);

insert into public.media_assets (
  id, remote_url, alt_text, source_url, attribution_text, rights_status
)
values
  (
    '77777777-7777-7777-7777-777777777701',
    'https://cdn.openagenda.com/main/test.full.image.jpg',
    'Test OpenAgenda',
    'https://openagenda.com/agendas/1/events/1',
    'Photo : Test · OpenAgenda',
    'needs_review'
  ),
  (
    '77777777-7777-7777-7777-777777777702',
    'https://example.com/unreviewed.jpg',
    'Test non approuvé',
    'https://example.com/event',
    'Photo : inconnue',
    'needs_review'
  );

insert into public.entity_media (entity_type, entity_id, media_id, is_cover)
values
  ('event', '55555555-5555-5555-5555-555555555501', '77777777-7777-7777-7777-777777777701', true),
  ('event', '55555555-5555-5555-5555-555555555501', '77777777-7777-7777-7777-777777777702', false);

set local role anon;

select results_eq(
  $$
    select count(*)::integer
    from public.media_assets
    where id = '77777777-7777-7777-7777-777777777701'
  $$,
  $$ values (1) $$,
  'anon can read a scoped OpenAgenda preview pending review'
);

select results_eq(
  $$
    select count(*)::integer
    from public.media_assets
    where id = '77777777-7777-7777-7777-777777777702'
  $$,
  $$ values (0) $$,
  'anon cannot read unrelated media pending review'
);

select results_eq(
  $$
    select image_url
    from public.public_events
    where id = '55555555-5555-5555-5555-555555555501'
  $$,
  $$ values ('https://cdn.openagenda.com/main/test.full.image.jpg'::text) $$,
  'public event exposes its OpenAgenda cover image'
);

reset role;
select * from finish();
rollback;
