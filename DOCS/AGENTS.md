# Instructions pour Cursor et Claude Code

## Source de vérité

Lire `README.md` puis les documents numérotés avant toute modification structurante. Ne pas inventer une fonctionnalité absente du périmètre.

## Règles de travail

- Toujours commencer par inspecter l'existant.
- Proposer un plan court avant une modification multi-fichiers.
- Faire de petits changements vérifiables.
- Préserver les modifications utilisateur non liées.
- Ne jamais modifier une décision figée silencieusement.
- Créer une ADR dans `docs/decisions/` pour tout changement architectural.
- Utiliser les versions stables compatibles et documenter celles réellement installées.
- Ne jamais placer de secret dans le dépôt, les logs ou les exemples.
- Ajouter ou adapter les tests avec chaque règle métier.
- Exécuter les vérifications pertinentes avant de déclarer le travail terminé.

## TypeScript

- mode strict ;
- éviter `any` ;
- valider les entrées externes avec Zod ;
- types partagés sans dépendance frontend ;
- erreurs métier typées ;
- pas d'assertion non-null sans justification.

## React Native/Expo

- composants fonctionnels ;
- logique serveur dans TanStack Query ;
- Zustand seulement pour état local transversal ;
- styles via tokens, pas de valeurs arbitraires répétées ;
- toutes les listes longues sont virtualisées ;
- permissions demandées au moment utile ;
- traiter hors-ligne, chargement, erreur et vide.

## Astro

- JavaScript client minimal ;
- génération statique par défaut ;
- métadonnées et données structurées ;
- aucune donnée privée dans les pages générées.

## Angular

- standalone components ;
- Signals et Reactive Forms ;
- guards pour l'UX, RLS pour la sécurité réelle ;
- administration inaccessible aux utilisateurs ordinaires.

## Supabase

- migration SQL pour tout changement de schéma ;
- RLS avant exposition ;
- service role uniquement côté serveur ;
- fonctions et imports idempotents ;
- PostGIS pour la distance ;
- archivage avant suppression ;
- pgTAP pour les politiques et fonctions critiques.

## Dépendances

Avant d'ajouter une dépendance, vérifier qu'une API de plateforme ou une dépendance existante ne suffit pas. Expliquer la valeur, la maintenance et l'impact sur la taille/sécurité.

## Interdictions MVP

Ne pas ajouter réseau social, chat, marketplace, IA conversationnelle, navigation de randonnée, billetterie propriétaire, microservices ou moteur de recherche externe.

## Format des réponses d'agent

À la fin : résultat, fichiers changés, tests exécutés, limites restantes et prochaine étape sûre.
