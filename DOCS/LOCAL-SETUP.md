# Configuration locale

## Chemin recommandé

```bash
# Docker Desktop doit être démarré
pnpm install          # une fois
pnpm dev:up           # Supabase + env + website + admin
```

Détails et vérifications : voir le **README racine**.

## Arrêt

```bash
# Ctrl+C sur le terminal dev:up, puis :
pnpm dev:down
```

## Variables d’environnement

`pnpm dev:up` les écrit automatiquement. Sinon, à la main :

- `apps/mobile/.env.example` → `apps/mobile/.env`
- `apps/website/.env.example` → `apps/website/.env.local`
- `apps/admin/.env.example` → `apps/admin/.env.local`

Remplir la clé anon via `pnpm supabase:status`.

L’admin lit aussi `apps/admin/src/environments/local.generated.ts` (régénéré par `dev:up`).

## Mobile

```bash
pnpm dev:mobile
# ou
pnpm dev:up -- --mobile
```

Le mobile est prévu en **development build** (`expo-dev-client`). MapLibre et notifications nécessiteront une build native EAS.

## Qualité

```bash
pnpm check
```
