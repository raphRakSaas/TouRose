-- Phase 5 profiles + user catalog sync

begin;
select plan(6);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'user_catalog_items', 'user_catalog_items table exists');

select policies_are(
  'public',
  'profiles',
  array['profiles_select_own', 'profiles_insert_own', 'profiles_update_own']
);

select policies_are(
  'public',
  'user_catalog_items',
  array[
    'user_catalog_select_own',
    'user_catalog_insert_own',
    'user_catalog_update_own',
    'user_catalog_delete_own'
  ]
);

select has_function('public', 'list_user_catalog_items', array[]::text[]);
select has_function('public', 'merge_user_catalog', array['jsonb']);

select * from finish();
rollback;
