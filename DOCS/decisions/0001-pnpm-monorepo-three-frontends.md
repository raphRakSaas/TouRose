# ADR 0001 — Monorepo pnpm et trois frontends

- Status: Accepted
- Date: 2026-07-18

## Context

TouRose a besoin d’une application mobile (expérience principale), d’un site public SEO/soutien, et d’une console d’administration. Le backend est unifié sur Supabase.

## Decision

- Monorepo **pnpm workspaces** sans Nx ni Turborepo au bootstrap.
- Frontends séparés : Expo (`apps/mobile`), Astro (`apps/website`), Angular (`apps/admin`).
- Contrats et tokens partagés via `packages/contracts`, `packages/design-tokens`, `packages/shared`.
- CI GitHub Actions multi-workflows, sans secrets pour les PR.

## Consequences

- Une seule source de vérité pour le schéma Zod et les tokens visuels.
- Outillage hétérogène (Jest mobile, Vitest ailleurs) assumé et documenté.
- Sur macOS case-insensitive, `docs/` et `DOCS/` désignent le même dossier : specs produit et guides opérationnels cohabitent sous `docs/`.
