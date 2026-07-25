-- Bootstrap local minimal : territoire, source OpenAgenda, compte admin.
-- Pas de catalogue fictif : les événements viennent de l'import OpenAgenda réel
-- (`pnpm import:openagenda` ou auto après reset si OPENAGENDA_PUBLIC_KEY est défini).
-- Les lieux « découverte » sont insérés par la migration discovery_places_catalog.

insert into public.territories (id, slug, name, timezone, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  'toulouse',
  'Toulouse',
  'Europe/Paris',
  true
)
on conflict (slug) do nothing;

insert into public.sources (
  id,
  name,
  kind,
  base_url,
  license_name,
  license_url,
  attribution_template,
  is_active
)
values (
  '22222222-2222-2222-2222-222222222201',
  'OpenAgenda Toulouse',
  'api',
  'https://api.openagenda.com/v2',
  'Selon conditions de chaque agenda OpenAgenda',
  'https://openagenda.com',
  'Données OpenAgenda — {title}',
  true
)
on conflict (id) do nothing;

-- Local admin only (never use this password outside local Docker).
-- Email: admin@tourose.local / Password: tourose-admin-local
do $$
declare
  admin_user_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
begin
  if not exists (select 1 from auth.users where id = admin_user_id) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@tourose.local',
      extensions.crypt('tourose-admin-local', extensions.gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"TouRose Local Admin"}'::jsonb,
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      admin_user_id,
      admin_user_id,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'admin@tourose.local',
        'email_verified', true
      ),
      'email',
      admin_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );
  end if;
end
$$;
