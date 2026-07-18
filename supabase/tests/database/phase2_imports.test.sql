begin;
select plan(5);

-- Anon cannot read import_runs
set local role anon;
select throws_ok(
  $$ select count(*) from public.import_runs $$,
  '42501',
  null,
  'anon cannot select import_runs'
);

select throws_ok(
  $$ select count(*) from public.import_errors $$,
  '42501',
  null,
  'anon cannot select import_errors'
);

select throws_ok(
  $$ select public.import_upsert_event('{"source_id":"22222222-2222-2222-2222-222222222201","external_id":"x","payload_hash":"h","title":"t","slug":"s"}'::jsonb) $$,
  '42501',
  null,
  'anon cannot call import_upsert_event'
);
reset role;

-- Authenticated without admin cannot read import_runs (RLS filters to zero / deny)
set local role authenticated;
select is(
  (select count(*)::integer from public.import_runs),
  0,
  'non-admin authenticated sees zero import_runs'
);
reset role;

-- Override helper returns override when present
insert into public.events (
  id,
  territory_id,
  slug,
  title,
  status
) values (
  '55555555-5555-5555-5555-555555555599',
  '11111111-1111-1111-1111-111111111111',
  'override-test-event',
  'Original title',
  'draft'
);

insert into public.editorial_overrides (
  entity_type,
  entity_id,
  field_name,
  value,
  reason
) values (
  'event',
  '55555555-5555-5555-5555-555555555599',
  'title',
  '"Titre éditorial"'::jsonb,
  'test'
);

select is(
  public.apply_editorial_override(
    'event',
    '55555555-5555-5555-5555-555555555599',
    'title',
    '"Incoming"'::jsonb
  ) #>> '{}',
  'Titre éditorial',
  'editorial override wins over incoming value'
);

select * from finish();
rollback;
