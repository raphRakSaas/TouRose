begin;
select plan(4);

select has_table('public', 'events', 'events table exists');
select has_table('public', 'places', 'places table exists');

select results_eq(
  $$
    select count(*)::integer
    from public.events
    where status = 'published'
  $$,
  $$ values (2) $$,
  'seed exposes two published events'
);

set local role anon;
select results_eq(
  $$
    select count(*)::integer from public.events
  $$,
  $$ values (2) $$,
  'anon can only read published events via RLS'
);
reset role;

select * from finish();
rollback;
