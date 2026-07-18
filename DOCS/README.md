# TouRose — dossier de référence

Ce dossier constitue la source de vérité initiale pour le développement de TouRose avec Cursor et Claude Code.

## Guides opérationnels (après bootstrap)

- `LOCAL-SETUP.md` — installation locale
- `SUPABASE-LOCAL.md` — Supabase CLI + Docker
- `ENV-VARS.md` — variables d’environnement
- `TESTING.md` — stratégie d’exécution des tests
- `CONTRIBUTING.md` — contribution et commits
- `TECH-VERSIONS.md` — versions installées
- `decisions/` — Architecture Decision Records

- Guides opérationnels (LOCAL-SETUP, SUPABASE-LOCAL, ENV-VARS, TESTING, CONTRIBUTING)
- `DESIGN-BRIEF.md` — brief design pour Claude Design / designer
- `TECH-VERSIONS.md`
- `decisions/` — ADR

## Ordre de lecture

1. `01-PRODUCT-VISION.md` — vision, cible et périmètre.
2. `02-FUNCTIONAL-SPEC.md` — fonctionnalités et règles métier.
3. `03-UX-AND-SCREENS.md` — navigation et écrans attendus.
4. `04-TECHNICAL-ARCHITECTURE.md` — stack et architecture.
5. `05-DATA-MODEL.md` — modèle PostgreSQL/PostGIS.
6. `06-DATA-SOURCES-AND-LICENSING.md` — imports, provenance et images.
7. `07-SECURITY-PRIVACY-AND-OPERATIONS.md` — sécurité, RGPD et exploitation.
8. `08-TESTING-AND-QUALITY.md` — stratégie de tests et critères qualité.
9. `09-DELIVERY-ROADMAP.md` — ordre de construction.
10. `AGENTS.md` — règles permanentes pour les agents de code.
11. `BOOTSTRAP-PROMPT.md` — prompt final pour initialiser le projet.

## Décisions figées

- Nom : **TouRose**.
- Signature : **Toulouse à voir, à vivre, à aimer.**
- Mobile : React Native, Expo, TypeScript et Expo Router.
- Site : Astro.
- Administration : Angular.
- Backend : Supabase avec PostgreSQL et PostGIS.
- Monorepo : pnpm workspaces.
- CI/CD : GitHub Actions.
- Utilisation sans compte obligatoire.
- Lancement limité à Toulouse et ses alentours.

## Principe produit

TouRose propose d'abord trois idées adaptées à la situation de l'utilisateur, tout en laissant l'intégralité des événements, lieux, parcs, monuments et activités à portée de main.

## Règle de modification

Une décision de ce dossier ne doit pas être changée silencieusement. Si une contrainte technique impose une évolution, créer une note de décision dans `docs/decisions/` expliquant le contexte, les options, le choix et ses conséquences.
