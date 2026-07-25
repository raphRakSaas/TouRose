# Supabase local

## Démarrer

```bash
pnpm supabase:start
pnpm supabase:status
# ou tout le stack local :
pnpm dev:up
```

Docker doit être en cours d’exécution. La CLI est fournie en dépendance de développement du monorepo (`pnpm exec supabase`).

## Réinitialiser schéma + seed

```bash
pnpm supabase:reset
```

Le seed (`supabase/seed.sql`) injecte uniquement le territoire Toulouse, la source OpenAgenda et le compte admin local. Les événements réels arrivent via l’import OpenAgenda ; les lieux « découverte » via la migration `discovery_places_catalog`.

Après un reset, si `OPENAGENDA_PUBLIC_KEY` est dans `supabase/functions/.env`, l’import réel est tenté automatiquement (les Edge Functions sont démarrées si besoin). En cas d’échec :

```bash
pnpm import:openagenda
# ou relance tout le stack :
pnpm dev:up
```

## Tests pgTAP

```bash
pnpm exec supabase test db
```

## Edge Functions

`pnpm dev:up` démarre `supabase functions serve` par défaut (requis pour l’import OpenAgenda). Sans `dev:up` :

```bash
pnpm exec supabase functions serve --env-file supabase/functions/.env
```

- `health` — pas de JWT
- `validate-report` — validation Zod, pas de secret
- `import-openagenda` — secret `IMPORT_CRON_SECRET` (voir `supabase/functions/.env.example`)
- `import-health` — vérifie fraîcheur / échecs, écrit dans `import_alerts`
- `register-push-subscription` — enregistre un token Expo push
- `send-push-notifications` — envoi vendredi (cron secret)
- `create-support-checkout` — Stripe Checkout (nécessite `STRIPE_SECRET_KEY`)
- `stripe-webhook` — webhook Stripe (`STRIPE_WEBHOOK_SECRET`)

Import local (API OpenAgenda réelle) :

```bash
pnpm import:openagenda
```

**Important :** après modification de `supabase/functions/.env` (ex. `STRIPE_SECRET_KEY`), redémarre complètement `pnpm dev:up` (`q` puis relance). Les Edge Functions ne rechargent pas le `.env` à chaud.

## Cron OpenAgenda (Phase 2)

En local, après `pnpm supabase:reset`, `sync-cron-runtime` configure `private.cron_runtime` pour `pg_cron` (toutes les 4 h si `functions serve` tourne).

Tick manuel (import + santé + push le vendredi) :

```bash
pnpm cron:tick
pnpm cron:sync-runtime   # resynchroniser anon key / URL Kong après reset
```

Cloud : workflow GitHub `.github/workflows/openagenda-cron.yml` (activer `OPENAGENDA_CRON_ENABLED=true` + secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `IMPORT_CRON_SECRET`).

## Arrêt

```bash
pnpm supabase:stop
```

## Production

Les migrations production restent désactivées dans GitHub Actions tant que les secrets plateforme ne sont pas configurés.
