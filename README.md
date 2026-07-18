# TouRose

> Toulouse à voir, à vivre, à aimer.

Monorepo Phase 0 : fondations testées pour l’application mobile Expo, le site Astro, l’admin Angular et Supabase local.

## Prérequis (une seule fois)

1. **Node.js** ≥ 22.12
2. **pnpm 10** via Corepack :
   ```bash
   corepack enable
   corepack prepare pnpm@10.14.0 --activate
   ```
3. **Docker Desktop** installé et **démarré** (voyant vert)
4. À la racine du repo :
   ```bash
   pnpm install
   ```

## Démarrer tout en une commande

```bash
pnpm dev:up
```

Ce script :

1. vérifie Docker ;
2. démarre (ou réutilise) **Supabase local** ;
3. écrit les fichiers d’env connectés ;
4. lance **website**, **admin** et **mobile** (Expo) ensemble.

### Lire les logs sans les mélanger

Dans le terminal `dev:up`, appuie sur une touche (sans Entrée) :

| Touche | Effet |
|--------|--------|
| `m` | logs **mobile** seulement |
| `a` | logs **admin** seulement |
| `s` | logs **site** (website) seulement |
| `f` | logs **functions** (si `--functions`) |
| `t` | **tout** (mélange coloré) |
| `c` | clear l’écran |
| `h` | réaffiche l’aide |
| `q` | quitter (comme Ctrl+C) |

Les fichiers `.logs/*.log` restent disponibles en parallèle si besoin (`tail -f .logs/mobile.log`).

Options :

```bash
pnpm dev:up -- --no-mobile     # sans Expo
pnpm dev:up -- --no-website    # sans Astro
pnpm dev:up -- --no-admin      # sans Angular
pnpm dev:up -- --functions     # + Edge Functions (import OpenAgenda)
```

### Admin local (après `pnpm supabase:reset` ou seed)

- URL : http://localhost:4200/login
- Email : `admin@tourose.local`
- Mot de passe : `tourose-admin-local` (**local Docker uniquement**)

Parcours Phase 1 : publier un lieu/événement dans l’admin → visible sur `/catalogue` et l’onglet Explorer mobile.

## Vérifier que Supabase tourne

```bash
pnpm supabase:status
```

Checks utiles :

```bash
# Studio (UI)
open http://127.0.0.1:54323

# Edge Function santé
curl -s http://127.0.0.1:54321/functions/v1/health

# Import OpenAgenda (fixture locale si pas de clé API)
pnpm import:openagenda

# Tests RLS / schéma
pnpm exec supabase test db
```

Réponse santé attendue : `{"status":"ok","service":"tourose-health",...}`

## Commandes manuelles (si tu préfères tout contrôler)

| Étape           | Commande               |
| --------------- | ---------------------- |
| Install         | `pnpm install`         |
| Start Supabase  | `pnpm supabase:start`  |
| Status / clés   | `pnpm supabase:status` |
| Reset DB + seed | `pnpm supabase:reset`  |
| Website         | `pnpm dev:website`     |
| Admin           | `pnpm dev:admin`       |
| Mobile          | `pnpm dev:mobile`      |
| Stop Supabase   | `pnpm supabase:stop`   |

## Qualité

```bash
pnpm check          # format + lint + typecheck + test + build
pnpm test
pnpm test:supabase  # skip si Docker/Supabase absents
```

## Scripts racine

| Script                         | Rôle                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `pnpm dev:up`                  | **Tout démarrer** (Supabase + env + website + admin + mobile) |
| `pnpm dev:down`                | Arrêter Supabase                                     |
| `pnpm format` / `format:check` | Prettier                                             |
| `pnpm lint`                    | ESLint                                               |
| `pnpm typecheck`               | TypeScript / Astro                                   |
| `pnpm test`                    | Tests unitaires                                      |
| `pnpm build`                   | Builds                                               |
| `pnpm check`                   | Pipeline qualité complète                            |
| `pnpm grant:admin`             | Promouvoir un user local en admin JWT                |
| `pnpm import:openagenda`       | Lancer l’import OpenAgenda (fixture ou API)          |
| `pnpm openagenda:find`         | Lister les agendas OpenAgenda + UID                  |

## Structure

```text
apps/mobile      Expo Router + NativeWind
apps/website     Astro + Tailwind
apps/admin       Angular standalone + Tailwind
packages/*       contracts, design-tokens, shared, configs
supabase/        migrations, seed, functions, tests
docs/            spécifications produit + guides opérationnels
scripts/         dev-up / dev-down / test-supabase
```

## Documentation

- Specs produit : `docs/01-*.md` … `docs/09-*.md`
- Agents : `docs/AGENTS.md`
- Guides : `LOCAL-SETUP.md`, `SUPABASE-LOCAL.md`, `ENV-VARS.md`, `TESTING.md`, `CONTRIBUTING.md`
- Backlog : `BACKLOG.md` — fait / reste / à enrichir
- Auth admin & sécu : `ADMIN-AUTH-AND-SECURITY.md` — JWT rôle, promotion, injection SQL
- Design : `DESIGN-BRIEF.md` — brief complet pour Claude Design / designer
- Versions : `TECH-VERSIONS.md`
- ADR : `decisions/`

## Sécurité

Aucun secret cloud n’est versionné. `pnpm dev:up` génère des fichiers locaux (clés **anon** de démo Supabase CLI uniquement). Ne jamais y coller une **service role** de production.
