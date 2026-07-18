# Supabase local

## Démarrer

```bash
pnpm supabase:start
pnpm supabase:status
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
pnpm exec supabase functions serve health
pnpm exec supabase functions serve validate-report
```

La fonction `health` ne nécessite pas de JWT. `validate-report` valide l’entrée avec Zod et ne contient aucun secret.

## Arrêt

```bash
pnpm supabase:stop
```

## Production

Les migrations production restent désactivées dans GitHub Actions tant que les secrets plateforme ne sont pas configurés.
