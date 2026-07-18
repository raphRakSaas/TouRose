# Architecture technique

## Stack figée

### Mobile

- React Native ;
- Expo en development builds, pas uniquement Expo Go ;
- TypeScript strict ;
- Expo Router ;
- TanStack Query ;
- Zustand pour l'état local minimal ;
- React Hook Form et Zod ;
- Expo SQLite pour le cache et les données invité ;
- MapLibre React Native ;
- Expo Notifications ;
- NativeWind pour les styles, avec tokens partagés.

### Site

- Astro ;
- TypeScript strict ;
- Tailwind CSS ;
- rendu statique par défaut, serveur seulement lorsque justifié ;
- pages publiques SEO et Stripe Checkout.

### Administration

- Angular ;
- TypeScript strict ;
- Signals et Reactive Forms ;
- Tailwind CSS et Angular CDK ;
- routes protégées et rôle administrateur.

### Backend

- Supabase hébergé ;
- PostgreSQL ;
- PostGIS ;
- Auth ;
- Storage ;
- Edge Functions ;
- Cron ;
- RLS sur toutes les tables exposées.

## Architecture logique

```text
Mobile Expo ───────────────┐
Site Astro ────────────────┼── Supabase Data API / RPC
Admin Angular ─────────────┘             │
                                         ├── PostgreSQL + PostGIS
                                         ├── Auth
                                         ├── Storage
                                         └── Edge Functions
                                              ├── imports
                                              ├── recommandations
                                              ├── notifications
                                              └── paiements/webhooks

OpenAgenda ────────────────┐
DATAtourisme ──────────────┼── fonctions d'import planifiées
Toulouse Open Data ────────┤
Wikimedia Commons ─────────┘
```

## Monorepo

```text
apps/
  mobile/
  website/
  admin/
packages/
  contracts/
  config-eslint/
  config-typescript/
  design-tokens/
  shared/
supabase/
  migrations/
  functions/
  seed/
  tests/
docs/
  decisions/
.github/workflows/
```

## Frontières

- Le mobile n'accède qu'aux tables/vues explicitement exposées et protégées par RLS.
- Les clés privilégiées restent uniquement côté serveur.
- Les imports passent par les Edge Functions.
- Les corrections administratives sont auditables.
- Les contrats TypeScript partagés ne doivent pas contenir de dépendance UI.
- Le site ne doit pas devenir une seconde application complète.

## Authentification

- navigation publique sans compte ;
- compte facultatif pour synchroniser ;
- magic link d'abord ;
- Google et Apple ensuite ;
- rôle `admin` vérifié côté serveur et via RLS, jamais seulement dans l'interface.

## Données hors-ligne

- cache TanStack Query persisté dans SQLite ;
- favoris et historique invités dans SQLite ;
- file locale d'opérations à synchroniser ;
- stratégie de fusion idempotente à la connexion ;
- affichage de la date de fraîcheur ;
- aucune promesse de catalogue intégral hors-ligne au MVP.

## Recommandations

Une fonction SQL/RPC retourne des candidats filtrés et scorés. Les poids sont configurables. Le serveur renvoie aussi des raisons structurées, transformées en libellés par le client.

## Observabilité

- Sentry mobile, site, admin et fonctions ;
- identifiant de corrélation pour les imports ;
- table `import_runs` ;
- logs sans données personnelles inutiles ;
- alertes sur import échoué, taux d'erreur et données trop anciennes.

## Environnements

- local : Supabase CLI + émulateurs/appareils ;
- preview : services isolés et données de démonstration ;
- production : secrets distincts, migrations contrôlées ;
- jamais de données personnelles de production en local.

## Déploiements

- GitHub Actions vérifie lint, types, tests et builds ;
- website déployé après succès sur la branche principale ;
- admin déployé séparément ;
- migrations production avec validation explicite ;
- mobile construit via EAS ;
- EAS Update uniquement pour des changements compatibles avec le runtime natif.

## Principes de scalabilité

Commencer avec un monolithe modulaire. Optimiser dans cet ordre : index, requêtes, pagination, cache, stockage d'images, compute Supabase, file de travaux, puis services séparés seulement sur preuve de besoin.
