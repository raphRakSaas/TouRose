begin;
select plan(4);

-- import_alerts: anon cannot read
set local role anon;
select throws_ok(
  $$ select count(*) from public.import_alerts $$,
  '42501',
  null,
  'anon cannot select import_alerts'
);
reset role;

-- health RPC requires admin
set local role authenticated;
select throws_ok(
  $$ select public.get_openagenda_import_health() $$,
  '42501',
  null,
  'non-admin cannot call get_openagenda_import_health'
);
reset role;

-- service role can call health (missing runs => stale)
set local role service_role;
select is(
  (select public.get_openagenda_import_health() ->> 'status'),
  'missing',
  'health reports missing when no import runs'
);
reset role;

-- cron runtime table is private
select throws_ok(
  $$ select count(*) from private.cron_runtime $$,
  '42501',
  null,
  'public cannot read private.cron_runtime'
);

select * from finish();
rollback;
