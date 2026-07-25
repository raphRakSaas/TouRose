# Mise en production TouRose

Objectif : **taguer une version** (`v*`) et laisser GitHub Actions déployer l’infrastructure cloud.

Workflow : [`.github/workflows/release.yml`](../.github/workflows/release.yml)

---

## 1. Vue d’ensemble

```text
git tag v0.1.0 && git push origin v0.1.0
        │
        ▼
┌───────────────────┐
│  Quality gate     │  format, lint, test, build
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Supabase cloud   │  migrations + Edge Functions + secrets
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Build clients    │  website (Astro) + admin (Angular)
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Deploy hosting   │  Cloudflare Pages (optionnel)
└───────────────────┘
```

Le cron OpenAgenda cloud reste géré par [`.github/workflows/openagenda-cron.yml`](../.github/workflows/openagenda-cron.yml) (toutes les 4 h).

---

## 2. Prérequis (une seule fois)

### 2.1 Projet Supabase cloud

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Noter :
   - **Project ref** (ex. `abcd1234efgh5678`)
   - **Database password** (choisi à la création)
   - **URL** : `https://<ref>.supabase.co`
   - **anon key** (Settings → API)

3. Vérifier en local (optionnel) :

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
pnpm exec supabase link --project-ref <REF> --password "<DB_PASSWORD>"
pnpm exec supabase db push --linked
```

### 2.2 Environnement GitHub `production`

Repo → **Settings → Environments → New environment** → `production`  
(Recommandé : exiger une approbation manuelle pour le premier déploiement.)

### 2.3 Secrets GitHub (Settings → Secrets and variables → Actions)

| Secret                          | Obligatoire    | Description                                        |
| ------------------------------- | -------------- | -------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`         | oui            | Token personnel Supabase (Account → Access Tokens) |
| `SUPABASE_PROJECT_REF`          | oui            | Ref du projet cloud                                |
| `SUPABASE_DB_PASSWORD`          | oui            | Mot de passe Postgres du projet                    |
| `SUPABASE_URL`                  | oui            | `https://<ref>.supabase.co`                        |
| `SUPABASE_ANON_KEY`             | oui            | Clé anon / publishable                             |
| `IMPORT_CRON_SECRET`            | oui            | Secret partagé imports (`x-tourose-import-secret`) |
| `OPENAGENDA_PUBLIC_KEY`         | recommandé     | Clé lecture OpenAgenda                             |
| `OPENAGENDA_AGENDA_UID`         | recommandé     | UID agenda Toulouse                                |
| `STRIPE_SECRET_KEY`             | si soutien     | Clé secrète Stripe live/test                       |
| `STRIPE_WEBHOOK_SECRET`         | si soutien     | Secret webhook Stripe cloud                        |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | si soutien     | Clé publishable pour le site                       |
| `CLOUDFLARE_API_TOKEN`          | si hébergement | Token Pages (optionnel)                            |
| `CLOUDFLARE_ACCOUNT_ID`         | si hébergement | ID compte Cloudflare                               |

### 2.4 Variables GitHub (Settings → Variables)

| Variable                           | Valeur                | Effet                                        |
| ---------------------------------- | --------------------- | -------------------------------------------- |
| `SUPABASE_DEPLOY_ENABLED`          | `true`                | Active le déploiement Supabase au tag        |
| `PUBLIC_SITE_URL`                  | `https://tourose.app` | URL canonique du site                        |
| `OPENAGENDA_CRON_ENABLED`          | `true`                | Active le cron GitHub OpenAgenda             |
| `WEBSITE_DEPLOY_ENABLED`           | `true`                | Publie le site sur Cloudflare Pages          |
| `ADMIN_DEPLOY_ENABLED`             | `false`               | Publie l’admin (souvent restreint / interne) |
| `CLOUDFLARE_PAGES_PROJECT_WEBSITE` | nom projet            | Projet Pages pour le site                    |
| `CLOUDFLARE_PAGES_PROJECT_ADMIN`   | nom projet            | Projet Pages pour l’admin                    |

Sans `SUPABASE_DEPLOY_ENABLED=true`, le workflow release ne déploie rien (quality gate seulement).

---

## 3. Déployer

```bash
# depuis main à jour
git pull origin main
git tag v0.1.0
git push origin v0.1.0
```

Suivre l’exécution dans **Actions → Release (production)**.

### Scripts locaux (même logique que la CI)

```bash
# Variables d’env identiques aux secrets GitHub
export SUPABASE_ACCESS_TOKEN=...
export SUPABASE_PROJECT_REF=...
export SUPABASE_DB_PASSWORD=...
export SUPABASE_ANON_KEY=...
export IMPORT_CRON_SECRET=...

pnpm deploy:supabase          # migrations + functions + secrets
pnpm deploy:production        # supabase + build website/admin
```

---

## 4. Après le premier déploiement

1. **Promouvoir un admin** (SQL dans Supabase SQL Editor) :

```sql
-- après création du compte admin dans Auth
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'ton-email@example.com';
```

2. **Stripe webhook cloud** : pointer vers  
   `https://<ref>.supabase.co/functions/v1/stripe-webhook`

3. **Import OpenAgenda** : vérifier `OPENAGENDA_CRON_ENABLED=true` et lancer manuellement  
   **Actions → OpenAgenda cron → Run workflow**

4. **Mobile production** : configurer `EXPO_PUBLIC_*` dans EAS Secrets, puis build via EAS (`eas build --profile production`). Hors scope du workflow tag (pas de build natif payant automatique).

---

## 5. Rollback

- **Migrations** : pas de rollback automatique — préparer une migration corrective avant de re-tagger.
- **Edge Functions** : re-déployer depuis un tag précédent (`git checkout v0.0.9 && pnpm deploy:supabase`).
- **Site / admin** : rollback via l’historique Cloudflare Pages ou re-déploiement d’un artefact GitHub Actions.

---

## 6. Dépannage

| Symptôme                        | Piste                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Job Supabase ignoré             | `SUPABASE_DEPLOY_ENABLED` ≠ `true`                                                                 |
| `db push` échoue                | Vérifier `SUPABASE_DB_PASSWORD`, drift schéma                                                      |
| Health check KO                 | Functions pas déployées ou projet en pause                                                         |
| Site build OK mais pas en ligne | `WEBSITE_DEPLOY_ENABLED` ou secrets Cloudflare manquants                                           |
| Cron import inactif             | `OPENAGENDA_CRON_ENABLED=true` + secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `IMPORT_CRON_SECRET` |

Voir aussi : [`ENV-VARS.md`](./ENV-VARS.md), [`SUPABASE-LOCAL.md`](./SUPABASE-LOCAL.md), [`ADMIN-AUTH-AND-SECURITY.md`](./ADMIN-AUTH-AND-SECURITY.md).
