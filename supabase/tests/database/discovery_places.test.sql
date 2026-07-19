begin;
select plan(5);

select has_function(
  'public',
  'is_discovery_place_type',
  array['text'],
  'is_discovery_place_type exists'
);

select ok(
  public.is_discovery_place_type('park'),
  'park is a discovery place type'
);

select ok(
  not public.is_discovery_place_type('cultural_venue'),
  'cultural_venue is not a discovery place type'
);

select ok(
  (
    select count(*)::integer
    from public.list_public_places(200, null, null, true) place_row
    where place_row.place_type = 'cultural_venue'
  ) = 0,
  'discovery list excludes cultural_venue'
);

select ok(
  (
    select count(*)::integer
    from public.list_public_places(200, 43.6045, 1.444, true) place_row
    where place_row.slug = 'place-du-capitole'
  ) >= 1,
  'editorial Capitole place is listed for discovery'
);

select * from finish();
rollback;
