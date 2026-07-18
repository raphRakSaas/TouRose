-- Seed Toulouse DEMO data — clearly fictional, no protected content.

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
  '22222222-2222-2222-2222-222222222222',
  'TouRose Editorial Demo',
  'editorial',
  'https://tourose.app',
  'Demo / fictional',
  null,
  'Données fictives TouRose (DÉMO)',
  true
)
on conflict (id) do nothing;

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

insert into public.categories (id, slug, name, color_token, is_active)
values
  ('33333333-3333-3333-3333-333333333301', 'outdoor', 'Plein air', 'garonne-500', true),
  ('33333333-3333-3333-3333-333333333302', 'culture', 'Culture', 'violet-500', true)
on conflict (slug) do nothing;

insert into public.places (
  id,
  territory_id,
  slug,
  name,
  summary,
  description,
  place_type,
  location,
  address,
  postal_code,
  city,
  price_type,
  indoor_outdoor,
  status,
  published_at,
  last_verified_at
)
values (
  '44444444-4444-4444-4444-444444444401',
  '11111111-1111-1111-1111-111111111111',
  'jardin-fictif-des-briques',
  'Jardin fictif des briques roses (DÉMO)',
  'Lieu inventé pour les tests locaux TouRose.',
  'Aucune correspondance avec un lieu réel. Contenu de démonstration.',
  'park',
  extensions.st_setsrid(extensions.st_makepoint(1.444, 43.6045), 4326)::extensions.geography,
  'Place du Capitole (fictive)',
  '31000',
  'Toulouse',
  'free',
  'outdoor',
  'published',
  timezone('utc', now()),
  timezone('utc', now())
),
(
  '44444444-4444-4444-4444-444444444402',
  '11111111-1111-1111-1111-111111111111',
  'belvedere-imaginaire-garonne',
  'Belvédère imaginaire Garonne (DÉMO)',
  'Point de vue fictif pour le bootstrap.',
  'Donnée seed uniquement.',
  'viewpoint',
  extensions.st_setsrid(extensions.st_makepoint(1.4305, 43.599), 4326)::extensions.geography,
  'Quai de la Daurade (fictif)',
  '31000',
  'Toulouse',
  'free',
  'outdoor',
  'published',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (territory_id, slug) do nothing;

insert into public.events (
  id,
  territory_id,
  place_id,
  slug,
  title,
  summary,
  description,
  location,
  price_type,
  indoor_outdoor,
  status,
  published_at,
  last_verified_at,
  official_url
)
values (
  '55555555-5555-5555-5555-555555555501',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444401',
  'balade-fictive-quais',
  'Balade fictive sur les quais (DÉMO)',
  'Événement inventé — ne pas confondre avec un événement réel.',
  'Seed TouRose Phase 0.',
  null,
  'free',
  'outdoor',
  'published',
  timezone('utc', now()),
  timezone('utc', now()),
  'https://tourose.app/credits'
),
(
  '55555555-5555-5555-5555-555555555502',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444402',
  'atelier-chocolatine-imaginaire',
  'Atelier chocolatine imaginaire (DÉMO)',
  'Contenu fictif pour tests RLS et catalogue.',
  'Seed TouRose Phase 0.',
  null,
  'paid',
  'indoor',
  'published',
  timezone('utc', now()),
  timezone('utc', now()),
  null
),
(
  '55555555-5555-5555-5555-555555555503',
  '11111111-1111-1111-1111-111111111111',
  null,
  'brouillon-interne-demo',
  'Brouillon interne (DÉMO)',
  'Ne doit pas être visible anonymement.',
  'Draft seed row.',
  null,
  'unknown',
  'unknown',
  'draft',
  null,
  null,
  null
)
on conflict (territory_id, slug) do nothing;

insert into public.event_occurrences (event_id, starts_at, ends_at, status)
values
  (
    '55555555-5555-5555-5555-555555555501',
    timezone('utc', now()) + interval '2 days',
    timezone('utc', now()) + interval '2 days' + interval '2 hours',
    'scheduled'
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    timezone('utc', now()) + interval '5 days',
    timezone('utc', now()) + interval '5 days' + interval '90 minutes',
    'scheduled'
  )
on conflict do nothing;

insert into public.place_categories (place_id, category_id)
values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333301')
on conflict do nothing;

insert into public.event_categories (event_id, category_id)
values
  ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333301'),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302')
on conflict do nothing;

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

insert into public.collections (
  id,
  territory_id,
  slug,
  title,
  summary,
  description,
  status,
  sort_mode
)
values (
  '66666666-6666-6666-6666-666666666601',
  '11111111-1111-1111-1111-111111111111',
  'toulouse-demo-gratuit',
  'Toulouse gratuitement (DÉMO)',
  'Collection éditoriale fictive pour le bootstrap Phase 1.',
  'Contenu de démonstration — aucun droit tiers.',
  'published',
  'manual'
)
on conflict (territory_id, slug) do nothing;

insert into public.collection_items (collection_id, entity_type, entity_id, position)
values
  ('66666666-6666-6666-6666-666666666601', 'place', '44444444-4444-4444-4444-444444444401', 0),
  ('66666666-6666-6666-6666-666666666601', 'event', '55555555-5555-5555-5555-555555555501', 1)
on conflict do nothing;
