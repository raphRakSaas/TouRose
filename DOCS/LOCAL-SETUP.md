# Configuration locale

## Chemin recommandé

```bash
# Docker Desktop doit être démarré
pnpm install          # une fois
pnpm dev:up           # Supabase + env + website + admin + mobile
```

Détails et vérifications : voir le **README racine**.

## Logs (raccourcis clavier)

Dans le terminal `dev:up`, **une touche** filtre les logs (pas besoin d’Entrée) :

| Touche | Effet |
|--------|--------|
| `m` | mobile |
| `a` | admin |
| `s` | site (website) |
| `f` | functions (si démarrées avec `--functions`) |
| `t` | tout (mélange coloré) |
| `c` | clear |
| `h` | aide |
| `q` | quitter |

## Arrêt

```bash
# q ou Ctrl+C dans le terminal dev:up, puis :
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
