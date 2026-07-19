begin;
select plan(4);

select has_function(
  'public',
  'normalize_place_name',
  array['text'],
  'normalize_place_name exists'
);

select is(
  public.normalize_place_name('  Chapelle des Carmélites '),
  'chapelle des carmelites',
  'normalize_place_name strips accents, case and spaces'
);

-- Un lieu existant avec le même nom normalisé doit être réutilisé
-- même si l'external_id OpenAgenda diffère.
insert into public.places (
  id,
  territory_id,
  slug,
  name,
  place_type,
  status
) values (
  '77777777-7777-7777-7777-777777777701',
  '11111111-1111-1111-1111-111111111111',
  'test-dedupe-salle-fictive',
  'Salle Fictive Dédoublonnâge',
  'cultural_venue',
  'published'
);

-- Simule un appel service_role (import Edge Function).
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
end;
$$;

select is(
  (
    public.import_upsert_event(
      jsonb_build_object(
        'source_id', '22222222-2222-2222-2222-222222222201',
        'external_id', 'dedupe-test-event-1',
        'payload_hash', 'dedupe-hash-1',
        'title', 'Concert test dédoublonnage',
        'slug', 'concert-test-dedoublonnage',
        'place', jsonb_build_object(
          'external_id', 'dedupe-new-uid-123',
          'slug', 'oa-place-dedupe-new-uid-123-salle-fictive',
          'name', 'Salle fictive dedoublonnage'
        )
      )
    ) ->> 'place_id'
  )::uuid,
  '77777777-7777-7777-7777-777777777701'::uuid,
  'import reuses existing place with same normalized name'
);

select is(
  (
    select count(*)::integer
    from public.places
    where public.normalize_place_name(name) = 'salle fictive dedoublonnage'
  ),
  1,
  'no duplicate place created by import'
);

select * from finish();
rollback;
