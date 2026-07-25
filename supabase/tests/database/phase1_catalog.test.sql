begin;
select plan(6);

select has_function('public', 'is_admin', 'is_admin helper exists');
select has_view('public', 'public_places', 'public_places view exists');
select has_function('public', 'search_public_catalog', array['text', 'integer'], 'search rpc exists');
select has_function('public', 'admin_save_place', array['jsonb'], 'admin_save_place exists');

select cmp_ok(
  (select count(*)::integer from public.public_places),
  '>=',
  2,
  'public_places exposes published discovery places'
);

select cmp_ok(
  (select count(*)::integer from public.search_public_catalog('jardin', 10)),
  '>=',
  1,
  'search finds at least one jardin place'
);

select * from finish();
rollback;
