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
3. écrit les fichiers d’env connectés :
   - `apps/mobile/.env`
   - `apps/website/.env.local`
   - `apps/admin/.env.local`
   - `apps/admin/src/environments/local.generated.ts`
4. lance **website** (`http://localhost:4321`) et **admin** (`http://localhost:4200`).

Avec le mobile Expo dans le même terminal :

```bash
pnpm dev:up -- --mobile
```

Sinon, mobile à part :

```bash
pnpm dev:mobile
```

### Arrêt

- `Ctrl+C` dans le terminal `dev:up` → stoppe website/admin (et mobile si lancé)
- Puis pour éteindre Supabase :
  ```bash
  pnpm dev:down
  ```

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

# Tests RLS / schéma
pnpm exec supabase test db
```

Réponse santé attendue : `{"status":"ok","service":"tourose-health",...}`

## Commandes manuelles (si tu préfères tout contrôler)

| Étape | Commande |
| --- | --- |
| Install | `pnpm install` |
| Start Supabase | `pnpm supabase:start` |
| Status / clés | `pnpm supabase:status` |
| Reset DB + seed | `pnpm supabase:reset` |
| Website | `pnpm dev:website` |
| Admin | `pnpm dev:admin` |
| Mobile | `pnpm dev:mobile` |
| Stop Supabase | `pnpm supabase:stop` |

## Qualité

```bash
pnpm check          # format + lint + typecheck + test + build
pnpm test
pnpm test:supabase  # skip si Docker/Supabase absents
```

## Scripts racine

| Script | Rôle |
| --- | --- |
| `pnpm dev:up` | **Tout démarrer** (Supabase + env + website + admin) |
| `pnpm dev:down` | Arrêter Supabase |
| `pnpm format` / `format:check` | Prettier |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript / Astro |
| `pnpm test` | Tests unitaires |
| `pnpm build` | Builds |
| `pnpm check` | Pipeline qualité complète |

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
- Guides : `docs/LOCAL-SETUP.md`, `docs/SUPABASE-LOCAL.md`, `docs/ENV-VARS.md`, `docs/TESTING.md`, `docs/CONTRIBUTING.md`
- Versions : `docs/TECH-VERSIONS.md`
- ADR : `docs/decisions/`

## Sécurité

Aucun secret cloud n’est versionné. `pnpm dev:up` génère des fichiers locaux (clés **anon** de démo Supabase CLI uniquement). Ne jamais y coller une **service role** de production.
