# Prompt de configuration complète

Copier ce prompt dans Cursor Agent ou Claude Code depuis un dossier vide contenant ce dossier de documentation.

---

Tu es l'ingénieur principal chargé d'initialiser le monorepo de **TouRose** depuis zéro.

Avant toute action :

1. Lis complètement `README.md`, tous les documents `01-*.md` à `09-*.md` et `AGENTS.md`.
2. Résume les contraintes et signale toute incompatibilité détectée.
3. Inspecte l'environnement installé : Node, pnpm, Git, Docker, Supabase CLI, Expo/EAS CLI et outils système. N'installe rien globalement sans nécessité et autorisation.
4. Consulte les documentations officielles actuelles lorsque les commandes ou versions ont pu évoluer.
5. Présente un plan d'exécution découpé et attends seulement si une décision réellement bloquante manque. Sinon, continue.

## Objectif

Créer un monorepo fonctionnel, testé et documenté comprenant :

- `apps/mobile` : React Native avec Expo, TypeScript strict et Expo Router ;
- `apps/website` : Astro avec TypeScript strict et Tailwind ;
- `apps/admin` : Angular en standalone components, TypeScript strict et Tailwind/CDK ;
- `packages/contracts` : schémas Zod et types partagés sans dépendance UI ;
- `packages/design-tokens` : couleurs, typographies, espacements et rayons consommables par les trois interfaces ;
- `packages/shared` : utilitaires purs réellement partagés ;
- `supabase` : configuration locale, migrations, fonctions, seed et tests ;
- `.github/workflows` : intégration continue et déploiements préparés sans secrets réels ;
- `docs/decisions` : modèle ADR.

## Contraintes

- Utiliser `pnpm` et ses workspaces.
- Ne pas utiliser Nx ou Turborepo au bootstrap.
- Utiliser les dernières versions stables mutuellement compatibles, puis enregistrer les versions exactes dans le lockfile et dans `docs/TECH-VERSIONS.md`.
- Activer TypeScript strict partout.
- Configurer ESLint, Prettier, EditorConfig et conventions de commits simples.
- Ne jamais générer ni committer de secret.
- Fournir des `.env.example` documentés pour chaque application.
- Le mobile doit utiliser une development build Expo et rester compatible EAS Build.
- Configurer TanStack Query, Zustand, React Hook Form, Zod, Expo SQLite et la structure Expo Router, sans construire encore les fonctionnalités métier complètes.
- Configurer NativeWind sur mobile et Tailwind sur Astro/Angular avec des design tokens communs.
- Préparer MapLibre sans clé réelle ; utiliser une variable d'environnement pour l'URL de style/tuiles.
- Préparer Expo Notifications sans credentials réels.
- Supabase doit tourner localement via la CLI et Docker.
- Activer PostGIS, `unaccent`, `pg_trgm`, `pg_cron` et `pgcrypto` dans une migration initiale.
- Créer seulement un schéma vertical minimal : `territories`, `sources`, `places`, `events`, `event_occurrences` et `categories`, avec contraintes, index et RLS conformes à `05-DATA-MODEL.md`.
- Ajouter un seed Toulouse avec quelques données fictives clairement identifiées, sans recopier de contenu protégé.
- Créer une vue ou RPC publique minimale permettant de lire les événements publiés à venir.
- Ajouter un exemple d'Edge Function TypeScript validant son entrée avec Zod et sans secret codé en dur.
- Ajouter une fonction de santé ou vérification simple utilisable par la CI.

## Tests et qualité

Configurer :

- Vitest pour les packages et Astro ;
- Angular testing avec le runner stable recommandé par la version installée ;
- Jest et React Native Testing Library pour Expo ;
- pgTAP pour les contraintes et RLS Supabase ;
- tests Deno pour les Edge Functions ;
- scripts racine `format`, `lint`, `typecheck`, `test`, `test:integration`, `build` et `check` ;
- un test minimal réellement utile dans chaque application/package ;
- une CI GitHub Actions avec cache pnpm, exécution par étapes et aucune dépendance à des secrets pour les pull requests.

## Squelettes fonctionnels attendus

### Mobile

- quatre onglets : Aujourd'hui, Explorer, Carte, Pour moi ;
- écrans placeholder accessibles ;
- provider TanStack Query ;
- thème/tokens ;
- exemple de lecture des données mockées ou locales ;
- aucun login obligatoire.

### Website

- accueil TouRose ;
- page de confidentialité placeholder clairement marquée ;
- page crédits/sources ;
- structure SEO de base ;
- aucun paiement réel.

### Admin

- shell avec navigation ;
- écran connexion placeholder ;
- tableau de bord placeholder ;
- garde de route structurée, sans fausse sécurité côté client ;
- client Supabase configurable.

## CI/CD

Créer des workflows séparés ou clairement segmentés pour :

- validation des pull requests ;
- preview website/admin lorsqu'un fournisseur est configuré ultérieurement ;
- vérification Supabase locale ;
- préparation EAS sans lancer de build payant ni publier ;
- migrations production désactivées tant que les secrets et environnements ne sont pas configurés.

## Documentation attendue

Créer :

- README racine avec prérequis et commandes ;
- guide de configuration locale ;
- guide Supabase local ;
- guide des variables d'environnement ;
- guide des tests ;
- guide de contribution ;
- `docs/TECH-VERSIONS.md` ;
- première ADR expliquant le monorepo pnpm et les trois frontends.

## Vérification finale

Avant de terminer :

1. Installe les dépendances avec le lockfile.
2. Démarre et arrête proprement Supabase local si Docker est disponible.
3. Exécute format check, lint, typecheck, tests, tests Supabase et builds.
4. Corrige les erreurs ; ne les masque pas avec des exclusions larges.
5. Vérifie qu'aucun secret, jeton ou URL privée n'est présent.
6. Affiche l'arborescence finale utile.
7. Fournis un compte rendu : décisions prises, versions, commandes exécutées, résultats, éléments nécessitant des comptes externes et prochaine étape recommandée.

Ne développe pas encore l'intégralité de TouRose. Le résultat recherché est une fondation propre, reproductible, sécurisée et testée sur laquelle les fonctionnalités pourront être ajoutées verticalement.

---
