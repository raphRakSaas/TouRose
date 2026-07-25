begin;
select plan(4);

set local role anon;
select throws_ok(
  $$ select count(*) from public.push_subscriptions $$,
  '42501',
  null,
  'anon cannot select push_subscriptions'
);

select throws_ok(
  $$ select count(*) from public.support_payments $$,
  '42501',
  null,
  'anon cannot select support_payments'
);
reset role;

set local role service_role;
insert into public.push_subscriptions (
  installation_id,
  expo_push_token,
  platform,
  notification_prefs
) values (
  'inst_test_phase6',
  'ExponentPushToken[phase6-test]',
  'ios',
  '{"weekendIdeas": true}'::jsonb
);

select is(
  (select count(*)::integer from public.push_subscriptions where installation_id = 'inst_test_phase6'),
  1,
  'service role can insert push subscription'
);

insert into public.support_payments (
  provider,
  external_id,
  installation_id,
  amount_cents,
  status,
  platform
) values (
  'stripe',
  'cs_test_phase6',
  'inst_test_phase6',
  500,
  'pending',
  'mobile'
);

select is(
  (select status from public.support_payments where external_id = 'cs_test_phase6'),
  'pending',
  'service role can insert support payment'
);
reset role;

select * from finish();
rollback;
