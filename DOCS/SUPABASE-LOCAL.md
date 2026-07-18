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

Le seed (`supabase/seed.sql`) injecte un territoire Toulouse et des lieux/événements **fictifs** marqués DÉMO.

## Tests pgTAP

```bash
pnpm exec supabase test db
```

## Edge Functions

```bash
pnpm exec supabase functions serve
# ou une fonction :
pnpm exec supabase functions serve import-openagenda
```

- `health` — pas de JWT
- `validate-report` — validation Zod, pas de secret
- `import-openagenda` — secret `IMPORT_CRON_SECRET` (voir `supabase/functions/.env.example`)

Import local (mode fixture si pas de clé OpenAgenda) :

```bash
pnpm import:openagenda
```

## Arrêt

```bash
pnpm supabase:stop
```

## Production

Les migrations production restent désactivées dans GitHub Actions tant que les secrets plateforme ne sont pas configurés.
