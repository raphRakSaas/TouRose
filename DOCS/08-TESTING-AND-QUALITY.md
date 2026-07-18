# Tests et qualité

## Philosophie

Tester en priorité les règles qui pourraient afficher une mauvaise sortie, perdre une donnée personnelle, violer une licence ou casser la publication.

## Mobile

- tests unitaires : score de recommandation, formatage, filtres et synchronisation ;
- tests composants avec React Native Testing Library ;
- mocks réseau avec MSW lorsque compatible ;
- tests d'intégration du cache SQLite ;
- tests des permissions localisation/notifications ;
- tests manuels sur appareils iOS et Android avant release.

## Site Astro

- Vitest pour transformations et composants interactifs ;
- validation des métadonnées SEO ;
- vérification des liens et crédits ;
- tests de génération des pages ;
- audit accessibilité et performance.

## Administration Angular

- tests des services, guards, formulaires et composants ;
- tests d'intégration des opérations de publication ;
- vérification que le rôle client ne suffit jamais à autoriser l'action.

## Backend

- pgTAP pour contraintes, vues, fonctions et RLS ;
- tests Deno des Edge Functions ;
- jeux de réponses enregistrées pour les imports ;
- tests d'idempotence ;
- tests de déduplication ;
- tests de conservation des overrides ;
- tests des dates, fuseau Europe/Paris et changements d'heure ;
- tests de suppression/archivage.

## Tests contractuels

Chaque source externe possède des fixtures minimales, normales et invalides. Une modification de schéma doit échouer clairement et créer une erreur d'import exploitable.

## E2E

À introduire après stabilisation du MVP :

- ouverture sans compte ;
- recherche et consultation ;
- ajout d'un favori invité ;
- création de compte et fusion ;
- publication admin ;
- signalement ;
- soutien en environnement de test.

## Pipeline obligatoire

Chaque pull request :

1. format ;
2. lint ;
3. typecheck ;
4. tests unitaires ;
5. tests d'intégration affectés ;
6. build des applications concernées ;
7. vérification des migrations.

## Définition de terminé

- critères fonctionnels satisfaits ;
- états chargement/erreur/vide/hors-ligne traités ;
- tests pertinents présents ;
- accessibilité vérifiée ;
- analytics et logs sans donnée sensible ;
- documentation mise à jour ;
- aucune nouvelle dépendance sans justification ;
- aucun avertissement TypeScript ou lint ignoré sans explication.

## Couverture

Ne pas poursuivre un pourcentage arbitraire. Exiger une couverture élevée pour scoring, imports, licences, RLS et synchronisation ; accepter moins de couverture sur présentation pure si les parcours sont vérifiés.
