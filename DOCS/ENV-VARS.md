# Variables d’environnement

## Principes

- Seules des clés **publiques** (anon / publishable) peuvent apparaître côté clients.
- La **service role** reste serveur / CI sécurisée, jamais dans mobile, website ou admin.
- Les fichiers `.env` sont gitignorés ; versionner uniquement `.env.example`.

## Mobile (`apps/mobile`)

| Variable                            | Description             |
| ----------------------------------- | ----------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`          | URL API Supabase        |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`     | Clé anon                |
| `EXPO_PUBLIC_MAP_STYLE_URL`         | Style / tuiles MapLibre |
| `EXPO_PUBLIC_NOTIFICATIONS_ENABLED` | Feature flag local      |

Credentials push : EAS Secrets uniquement.

## Website (`apps/website`)

| Variable                        | Description          |
| ------------------------------- | -------------------- |
| `PUBLIC_SITE_URL`               | URL canonique        |
| `PUBLIC_SUPABASE_URL`           | URL API              |
| `PUBLIC_SUPABASE_ANON_KEY`      | Clé anon             |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publishable test |

## Admin (`apps/admin`)

Configurer `apps/admin/src/environments/environment.ts` (ou mécanisme d’env Angular) avec URL + anon key. Ne jamais y placer la service role.

| Variable / champ        | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `supabaseUrl`           | URL API                                          |
| `supabaseAnonKey`       | Clé anon                                         |
| `importCronSecret`      | Secret local pour déclencher `import-openagenda` |

## Imports OpenAgenda (Edge Function)

| Variable                 | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `IMPORT_CRON_SECRET`     | Header `x-tourose-import-secret` (obligatoire)   |
| `OPENAGENDA_PUBLIC_KEY`  | Clé publique lecture OA (sinon mode fixture)     |
| `OPENAGENDA_AGENDA_UID`  | UID d’agenda OpenAgenda                          |
| `SUPABASE_URL`           | Injecté par le runtime Edge                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Injecté par le runtime Edge                   |

Fichier d’exemple : `supabase/functions/.env.example`.  
Script local : `pnpm import:openagenda`.
