# ADR 0007 — Déploiement production par tag Git

Date : 2026-07-25  
Statut : accepté

## Contexte

TouRose utilise Supabase local en développement. Pour la production, il faut déployer migrations, Edge Functions, secrets et builds clients (website, admin) de façon reproductible, sans manipulation manuelle à chaque release.

Le backlog mentionnait des migrations production désactivées en attendant les secrets cloud.

## Decision

1. **Déclencheur** : push d’un tag sémantique `v*` sur GitHub.
2. **Workflow** : `.github/workflows/release.yml` avec environnement GitHub `production`.
3. **Supabase** : script `scripts/deploy-supabase.mjs` (link → `db push` → `functions deploy` → `secrets set` → sync `cron_runtime`).
4. **Clients** : `scripts/write-production-env.mjs` génère les env de build ; website + admin buildés en artefacts CI.
5. **Hébergement** : Cloudflare Pages optionnel via variables `WEBSITE_DEPLOY_ENABLED` / `ADMIN_DEPLOY_ENABLED`.
6. **Feature flags** : variables repo (`SUPABASE_DEPLOY_ENABLED`, etc.) pour activer progressivement sans casser la CI.

Le mobile natif (EAS) reste hors du workflow tag automatique (build payant, credentials Apple/Google externes).

## Conséquences

- Un tag = une release traçable (artefacts + résumé GitHub Actions).
- Les secrets ne sont jamais commités ; configuration documentée dans `docs/PRODUCTION-DEPLOY.md`.
- Rollback migrations non automatique : corrections via nouvelles migrations SQL.
- Le cron OpenAgenda cloud continue via `openagenda-cron.yml` (GitHub schedule), complémentaire à pg_cron si disponible sur le plan Supabase.
