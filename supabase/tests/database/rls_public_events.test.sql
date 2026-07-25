begin;
select plan(4);

select has_table('public', 'events', 'events table exists');
select has_table('public', 'places', 'places table exists');

insert into public.events (
  id,
  territory_id,
  slug,
  title,
  status
)
values
  (
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111111',
    'rls-test-published-a',
    'RLS test published A',
    'published'
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '11111111-1111-1111-1111-111111111111',
    'rls-test-published-b',
    'RLS test published B',
    'published'
  ),
  (
    '55555555-5555-5555-5555-555555555503',
    '11111111-1111-1111-1111-111111111111',
    'rls-test-draft',
    'RLS test draft',
    'draft'
  );

select results_eq(
  $$
    select count(*)::integer
    from public.events
    where id in (
      '55555555-5555-5555-5555-555555555501',
      '55555555-5555-5555-5555-555555555502',
      '55555555-5555-5555-5555-555555555503'
    )
    and status = 'published'
  $$,
  $$ values (2) $$,
  'published events are readable in test fixture'
);

set local role anon;
select results_eq(
  $$
    select count(*)::integer
    from public.events
    where id in (
      '55555555-5555-5555-5555-555555555501',
      '55555555-5555-5555-5555-555555555502',
      '55555555-5555-5555-5555-555555555503'
    )
  $$,
  $$ values (2) $$,
  'anon can only read published events via RLS'
);
reset role;

select * from finish();
rollback;
