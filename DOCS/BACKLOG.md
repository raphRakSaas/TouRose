# Backlog TouRose

Vue d’ensemble de ce qui est **fait**, **en cours** et **à faire**.  
Ce fichier est vivant : **ajoute des lignes** au fur et à mesure (bugs, idées, dettes techniques).

Dernière mise à jour : **2026-07-18** (Phase 2 OpenAgenda partielle)

---

## Comment utiliser ce fichier

### Statuts

| Marque | Signification |
| --- | --- |
| `[x]` | Fait (vérifiable dans le repo / local) |
| `[~]` | Partiel / squelette (usable mais incomplet vs MVP) |
| `[ ]` | À faire |
| `[!]` | Bloqué / dépend d’un compte externe ou d’une décision |
| `[-]` | Annulé / hors périmètre volontaire |

En Markdown pur, seuls `[x]` et `[ ]` sont des cases à cocher natives.  
Utilise `[~]` / `[!]` / `[-]` comme **préfixe texte** dans le libellé, ex. :

```md
- [ ] [~] Explorer mobile — filtres avancés pas encore là
- [ ] [!] EAS Build — besoin compte Expo
```

### Ajouter une tâche

1. Choisis la **phase** ou la section **Hors phase / idées**.
2. Ajoute une ligne `- [ ] …` avec un verbe clair.
3. Optionnel : ajoute `<!-- owner: … -->` ou une date en fin de ligne.
4. Mets à jour la **date** en tête de fichier et le **tableau résumé**.

### Règle

Une tâche = un résultat vérifiable.  
Exemple : « Publier un lieu depuis l’admin visible sur `/catalogue` » plutôt que « Améliorer l’admin ».

---

## Résumé exécutif

| Phase | Statut | Critère de sortie | Avancement |
| --- | --- | --- | --- |
| **0 — Fondations** | Fait | Apps démarrent, CI, migration locale | ~100 % |
| **1 — Catalogue admin** | Fait | Admin publie → visible mobile/web | ~100 % (doublons / MFA / médias upload / SSR reportés) |
| **Design** | En cours | Brief + maquette mobile intégrée | Mobile UI OK ; site/admin maquettes ouvertes |
| **2 — Imports** | Partiel | OpenAgenda idempotent | ~70 % (OA + admin fraîcheur ; autres sources / cron prod ouverts) |
| **3 — Cœur mobile** | En cours | Onboarding, fiches, favoris, carte | ~55 % (UI maquette + Explorer réel ; MapLibre/favoris SQLite ouverts) |
| **4 — Recommandations** | À faire | 3 suggestions scorées | ~5 % (mock Aujourd’hui) |
| **5 — Comptes / sync** | À faire | Magic link + fusion locale | 0 % |
| **6 — Notifs / soutien** | À faire | Push + Stripe + IAP | 0 % |
| **7 — Boutiques** | À faire | Store-ready | 0 % |

**Prochaine priorité recommandée :** terminer **design** (maquettes), puis **Phase 3** mobile — ou brancher une vraie clé OpenAgenda / cron prod pour finaliser Phase 2.

---

## Phase 0 — Fondations

**Critère :** chaque app démarre, CI OK, migration testée localement.

### Monorepo & tooling

- [x] Monorepo pnpm workspaces (sans Nx/Turborepo)
- [x] TypeScript strict (base + apps)
- [x] ESLint + Prettier + EditorConfig
- [x] Commitlint / husky (commit-msg)
- [x] Scripts racine `format`, `lint`, `typecheck`, `test`, `build`, `check`
- [x] `pnpm dev:up` / `dev:down` (stack local)
- [x] README + guides locaux
- [x] ADR monorepo (`docs/decisions/0001-…`)
- [x] `docs/TECH-VERSIONS.md`

### Packages

- [x] `@tourose/contracts` (Zod)
- [x] `@tourose/design-tokens`
- [x] `@tourose/shared`
- [x] `@tourose/config-typescript`
- [ ] Package `config-eslint` dédié (aujourd’hui ESLint racine suffit)

### Apps squelettes

- [x] `apps/mobile` Expo Router + onglets
- [x] `apps/website` Astro + Tailwind
- [x] `apps/admin` Angular standalone + Tailwind
- [x] `.env.example` par app
- [x] Tests minimaux par zone

### Supabase local

- [x] `supabase/config.toml`
- [x] Migrations initiales + extensions (PostGIS, unaccent, pg_trgm, pgcrypto ; pg_cron best-effort)
- [x] Seed Toulouse DÉMO
- [x] pgTAP de base
- [x] Edge Functions `health` + `validate-report`
- [x] Script `test:supabase`

### CI/CD

- [x] Workflow PR (format/lint/typecheck/test/build + job Supabase)
- [x] Workflows placeholder preview / EAS / migrations prod (désactivées)
- [ ] [!] Secrets CI cloud (Supabase, EAS, hébergeur) — quand comptes créés
- [ ] Activer vraiment les preview deploys
- [ ] Activer `db push` prod sécurisé

---

## Phase 1 — Catalogue administré

**Critère :** un admin publie un lieu et un événement visibles sur mobile et web.

### Modèle & backend

- [x] Tables `territories`, `sources`, `categories`, `places`, `events`, `event_occurrences`
- [x] Tables de liaison catégories
- [x] RLS lecture anonyme du publié
- [x] Vue `public_events` + RPC `list_upcoming_public_events`
- [x] Vue `public_places` + RPC `list_public_places`
- [x] RPC `search_public_catalog`
- [x] `is_admin()` + RLS écriture admin
- [x] RPC `admin_save_place` / `admin_save_event`
- [x] Seed admin local `admin@tourose.local`
- [x] ADR Phase 1 (`docs/decisions/0002-…`)
- [x] Tables `media_assets` / `entity_media`
- [x] RLS médias (lecture publique si autorisés)
- [x] Admin CRUD catégories / sources (UI)
- [x] Soft archive UI (plutôt que delete) documenté dans l’admin
- [x] Collections éditoriales (schéma + lecture publique + seed DÉMO)
- [ ] Admin UI CRUD collections + upload médias (reporté Phase 3 / polish)

### Admin

- [x] Login Supabase (email/password local)
- [x] Guard UX + RLS réelle
- [x] Rôle admin via JWT `app_metadata.role` (pas user_metadata)
- [x] Doc `ADMIN-AUTH-AND-SECURITY.md` + script `pnpm grant:admin`
- [x] Tests pgTAP : anon / non-admin ne peuvent pas `admin_save_*`
- [x] Dashboard compteurs
- [x] Liste / création / édition lieux
- [x] Liste / création / édition événements (+ occurrence)
- [x] Publication via statut `published`
- [x] Édition occurrences multiples par événement
- [x] Prévisualisation « tel que public » (lien site catalogue)
- [ ] Gestion doublons (UI) — Phase 2 imports
- [x] Journal d’audit (table + UI)
- [ ] Magic link admin / MFA (plus tard)
- [ ] Edge Function prod « promote admin » (sans exposer service role)

### Mobile lecture

- [x] Client Supabase
- [x] Explorer : événements à venir, lieux, recherche
- [~] Aujourd’hui encore sur suggestions **mock**
- [x] Fiches détail événement / lieu (`/event/[slug]`, `/place/[slug]`)
- [x] Pull-to-refresh + bouton réessayer sur Explorer / fiches
- [ ] États erreur / empty states soignés (design)

### Website lecture

- [x] Page `/catalogue`
- [x] Accueil + crédits + confidentialité placeholder
- [x] Fiches détail SEO (`/catalogue/lieux/[slug]`, `/catalogue/evenements/[slug]`)
- [x] Recherche sur le site (`?q=` + RPC `search_public_catalog`)
- [ ] SSR/ISR pour fraîcheur catalogue en prod

### Contracts

- [x] Schémas rows publics + search + inputs admin
- [x] Schémas médias / collections publics
- [ ] Schémas reports complets (Phase 3 signalements)

---

## Design (parallèle)

Source : `docs/DESIGN-BRIEF.md` + `DESIGN/TouRose - Maquette App.html`

- [x] Brief design complet rédigé
- [x] Maquette mobile HTML livrée (onboarding + 4 tabs + fiches + soutien)
- [x] Tokens mobile alignés maquette (Fraunces / Source Sans 3, couleurs exactes)
- [x] Intégration pixel-perfect mobile (écrans MVP principaux)
- [ ] Direction artistique / moodboard formalisé hors maquette
- [ ] Logo / wordmark TouRose (assets export)
- [ ] Maquettes site
- [ ] Maquettes admin
- [ ] Export assets / icônes / placeholders photos
- [ ] Polish états (skeleton shimmer animé, hors-ligne)

---

## Phase 2 — Imports

**Critère :** import idempotent, observable, corrigible depuis l’admin.

- [x] Table `external_records`
- [x] Tables `import_runs` / `import_errors`
- [x] Table `editorial_overrides`
- [x] Edge Function / job import **OpenAgenda** (premier) — fixture locale + API si clé
- [x] Normalisation dates / lieux / prix (prix encore `unknown` par défaut)
- [x] Déduplication (clé externe + log `possible_duplicate`, pas de merge destructif)
- [x] Application des overrides à l’import (`import_upsert_event`)
- [x] Droits médias à l’import (ne jamais publier sans licence — log `media_rights`)
- [x] Admin : tableau de fraîcheur des imports (`/imports`)
- [x] Fixtures de contrats / normalize (Deno) + pgTAP RLS imports
- [x] ADR `0003-phase2-openagenda-import`
- [ ] Import **DATAtourisme**
- [ ] Import **Toulouse Open Data** (parcs / équipements)
- [ ] Cron d’import (pg_cron ou scheduler Supabase)
- [ ] Alertes import échoué / source trop ancienne
- [ ] UI admin de résolution de doublons (au-delà du journal)
---

## Phase 3 — Cœur mobile

**Critère :** parcours découverte complet sans compte.

### Onboarding & Aujourd’hui

- [x] Onboarding skippable (histoire, intérêts, localisation expliquée) — UI maquette
- [x] Salutation + météo (placeholder Open-Meteo)
- [x] Sélecteur de moment
- [x] Trois suggestions (UI maquette ; scoring Phase 4 encore mock)
- [x] Affiner mes envies (feuille filtres)
- [x] Raccourcis Gratuit / Dehors / Week-end / Autour de moi

### Explorer & fiches

- [x] Segments Événements / Lieux / Collections
- [~] Filtres complets (chips UI ; logique avancée ouverte)
- [x] Fiche événement (favori local UI, partage/agenda stubs)
- [x] Fiche lieu
- [~] États UX : skeleton basique ; erreur/vide OK ; hors-ligne/obsolète ouverts

### Carte

- [x] UI carte maquette (placeholder stylé + panneau détail)
- [ ] MapLibre (development build)
- [ ] Marqueurs + clustering événement/lieu
- [ ] Attribution visible
- [ ] [!] Fournisseur de tuiles prod (pas OSM community CDN)

### Favoris & local

- [~] Favoris invité (UI locale ; SQLite ouvert)
- [~] À découvrir / visité (onglets UI)
- [ ] File d’ops à synchroniser (préparer Phase 5)
- [ ] Cache TanStack Query + SQLite
- [ ] Partage natif
- [ ] Ajout calendrier

---

## Phase 4 — Recommandations

**Critère :** 3 suggestions déterministes + raisons structurées.

- [ ] RPC / SQL scoring (temps, distance, budget, météo, préférences, fraîcheur, diversité, éditorial)
- [ ] Poids configurables
- [ ] Raisons structurées → libellés client
- [ ] Diversité (éviter 3× le même type)
- [ ] Table `recommendation_impressions` (privacy-friendly)
- [ ] Remplacer le mock de l’onglet Aujourd’hui
- [ ] Tests unitaires du scoring

---

## Phase 5 — Comptes et synchronisation

**Critère :** compte optionnel, fusion locale sans perte silencieuse.

- [ ] `profiles` + préférences cloud
- [ ] Magic link
- [ ] Sync favoris / visites / préférences
- [ ] Fusion locale → cloud idempotente
- [ ] Export données (RGPD)
- [ ] Suppression compte + données
- [ ] [!] Google Sign-In (après stabilisation)
- [ ] [!] Apple Sign-In (après stabilisation)

---

## Phase 6 — Notifications et soutien

- [ ] Consentement + préférences granulaires
- [ ] Push Expo (credentials EAS)
- [ ] Sélection week-end
- [ ] Rappel événement favori
- [ ] Event modifié / annulé
- [ ] Nouvelle collection pertinente
- [ ] Désinscription immédiate
- [ ] Page soutien site + Stripe Checkout
- [ ] IAP Apple / Google (consommables 1/5/10 €)
- [ ] Webhooks idempotents + table `support_payments`
- [ ] Remerciement UX

---

## Phase 7 — Préparation boutiques

- [ ] Politique de confidentialité définitive
- [ ] Parcours suppression de compte
- [ ] Captures App Store / Play
- [ ] Textes listing FR
- [ ] Tests appareils réels iOS + Android
- [ ] Sentry (mobile, web, admin, functions)
- [ ] Bêta fermée (TestFlight / Play internal)
- [ ] [!] Soumission App Store
- [ ] [!] Soumission Google Play
- [ ] Page statut / monitoring basique

---

## Qualité, sécu, ops (transversal)

- [x] Philosophie tests documentée
- [x] pgTAP catalogue / RLS
- [x] Auth admin JWT documentée + tests non-admin bloqués
- [x] Écritures admin via SQL paramétré (pas de concat → mitigation injection SQL)
- [ ] Couverture scoring / imports / licences (quand Phase 2–4)
- [ ] E2E (après stabilisation MVP) : ouvrir sans compte, favori, admin publish
- [ ] Rate limiting login / signalements
- [ ] MFA admin production
- [ ] Revue secrets / rotation documentée
- [ ] Exercice de restauration backup (prod)
- [ ] Registre sous-traitants RGPD
- [ ] Audit log promotions de rôle admin

---

## Hors phase / idées / dette

*(Ajoute ici librement.)*

- [ ] Remplacer suggestions mock Aujourd’hui dès qu’un scoring minimal existe
- [ ] Nettoyer composants template Expo inutilisés (`EditScreenInfo`, etc.)
- [ ] Harmoniser env admin (fichier généré vs `.env.local` Angular)
- [ ] Page catalogue web : recherche live
- [ ] Mode sombre ? (non prioritaire — identité chaude claire d’abord)
- [ ] [-] Réseau social / chat / marketplace / IA conversationnelle (interdit MVP)
- [ ] [-] Expansion nationale avant rétention Toulouse

### Après lancement (rappel roadmap)

- [ ] Contributions organisateurs
- [ ] Collections collaboratives
- [ ] OneSignal si campagnes complexes
- [ ] Moteur de recherche dédié si Postgres insuffisant
- [ ] Seconde ville (seulement après rétention prouvée)

---

## Journal des ajouts

| Date | Ajout |
| --- | --- |
| 2026-07-18 | Création du backlog initial (Phases 0–7 + design + transversal) |
| 2026-07-18 | Auth JWT admin + sécu injection SQL documentées / testées |

*(Ajoute une ligne ici quand tu modifies significativement le backlog.)*
