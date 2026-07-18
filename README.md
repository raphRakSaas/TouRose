# TouRose

> Toulouse à voir, à vivre, à aimer.

Monorepo Phase 0 : fondations testées pour l’application mobile Expo, le site Astro, l’admin Angular et Supabase local.

## Prérequis

- Node.js ≥ 22.12
- pnpm 10 (via Corepack : `corepack enable && corepack prepare pnpm@10.14.0 --activate`)
- Docker Desktop (pour Supabase local)
- Xcode / Android Studio pour les development builds natives (optionnel au bootstrap)

## Démarrage rapide

```bash
pnpm install
pnpm supabase:start   # nécessite Docker
pnpm --filter @tourose/mobile start
pnpm --filter @tourose/website dev
pnpm --filter @tourose/admin start
```

## Scripts racine

| Script                         | Rôle                                     |
| ------------------------------ | ---------------------------------------- |
| `pnpm format` / `format:check` | Prettier                                 |
| `pnpm lint`                    | ESLint dans les workspaces               |
| `pnpm typecheck`               | TypeScript / Astro check                 |
| `pnpm test`                    | Tests unitaires                          |
| `pnpm test:integration`        | Tests packages + script Supabase         |
| `pnpm build`                   | Builds concernés                         |
| `pnpm check`                   | format + lint + typecheck + test + build |

## Structure

```text
apps/mobile      Expo Router + NativeWind
apps/website     Astro + Tailwind
apps/admin       Angular standalone + Tailwind
packages/*       contracts, design-tokens, shared, configs
supabase/        migrations, seed, functions, tests
docs/            spécifications produit + guides opérationnels
```

## Documentation

- Specs produit : `docs/01-*.md` … `docs/09-*.md`
- Agents : `docs/AGENTS.md`
- Guides : `docs/LOCAL-SETUP.md`, `docs/SUPABASE-LOCAL.md`, `docs/ENV-VARS.md`, `docs/TESTING.md`, `docs/CONTRIBUTING.md`
- Versions : `docs/TECH-VERSIONS.md`
- ADR : `docs/decisions/`

## Sécurité

Aucun secret réel n’est versionné. Copier les `.env.example` vers `.env` localement.
