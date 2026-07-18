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
