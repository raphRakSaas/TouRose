# Tests

## Commandes

```bash
pnpm test                 # unitaires workspaces
pnpm test:integration     # packages + script Supabase
pnpm exec supabase test db
# Edge Functions (Deno installé séparément si besoin)
deno test supabase/functions/tests
```

## Répartition

| Zone             | Outil                                 |
| ---------------- | ------------------------------------- |
| packages + Astro | Vitest                                |
| Angular admin    | Vitest via `@angular/build:unit-test` |
| Expo mobile      | Jest + jest-expo + RNTL (prêt)        |
| Supabase SQL     | pgTAP                                 |
| Edge Functions   | Deno test                             |

## CI

Les pull requests exécutent format, lint, typecheck, tests et builds sans secrets. Un job dédié démarre Supabase localement sur Ubuntu.
