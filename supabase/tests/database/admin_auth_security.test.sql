begin;
select plan(3);

-- Anonymous caller is not an admin
set local role anon;
select is(
  public.is_admin(),
  false,
  'anon is_admin() is false'
);

-- Anonymous cannot execute admin_save_place (no GRANT to anon — stronger than app check)
select throws_ok(
  $$
    select public.admin_save_place(jsonb_build_object(
      'territory_id', '11111111-1111-1111-1111-111111111111',
      'slug', 'should-fail',
      'name', 'Should Fail',
      'place_type', 'park',
      'status', 'published'
    ))
  $$,
  '42501'
);
reset role;

-- Authenticated without admin claim still denied
set local role authenticated;
select is(
  public.is_admin(),
  false,
  'authenticated without admin claim is_admin() is false'
);
reset role;

select * from finish();
rollback;
