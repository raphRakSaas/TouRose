# Configuration locale

## Chemin recommandé

```bash
# Docker Desktop doit être démarré
pnpm install          # une fois
pnpm dev:up           # Supabase + env + website + admin + mobile
```

Détails et vérifications : voir le **README racine**.

## Logs (séparés)

Dans le terminal `dev:up`, chaque ligne a un préfixe couleur : `[website]`, `[admin]`, `[mobile]`.

Pour ne suivre **qu’une** app :

```bash
tail -f .logs/mobile.log
tail -f .logs/website.log
tail -f .logs/admin.log
```

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

## Options `dev:up`

```bash
pnpm dev:up -- --no-mobile     # sans Expo
pnpm dev:up -- --functions     # + Edge Functions
pnpm dev:mobile                # mobile seul (si besoin)
```

Le mobile est prévu en **development build** (`expo-dev-client`). MapLibre et notifications nécessiteront une build native EAS.

## Qualité

```bash
pnpm check
```
