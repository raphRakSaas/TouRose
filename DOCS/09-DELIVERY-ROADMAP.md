# Feuille de route

## Phase 0 — fondations

- monorepo ;
- conventions ;
- CI ;
- Supabase local ;
- environnements ;
- design tokens ;
- applications squelettes ;
- premiers tests.

Critère de sortie : chaque application démarre, la CI passe et une migration testée fonctionne localement.

## Phase 1 — catalogue administré

- modèle sources, lieux, événements, occurrences, catégories et médias ;
- RLS ;
- données de démonstration ;
- dashboard CRUD minimal ;
- catalogue mobile et site ;
- recherche de base.

Critère : un administrateur publie un lieu et un événement visibles sur mobile et web.

## Phase 2 — imports

- OpenAgenda en premier ;
- DATAtourisme ensuite ;
- journal d'import ;
- déduplication ;
- overrides ;
- gestion des droits médias.

Critère : import idempotent, observable et corrigible depuis l'administration.

## Phase 3 — cœur mobile

- onboarding ;
- Aujourd'hui ;
- Explorer ;
- Carte ;
- fiches ;
- favoris invités ;
- partage et calendrier ;
- cache hors-ligne.

## Phase 4 — recommandations

- filtres situationnels ;
- scoring déterministe ;
- raisons de recommandation ;
- diversité ;
- collecte d'impressions respectueuse de la vie privée.

## Phase 5 — comptes et synchronisation

- magic link ;
- synchronisation favoris/historique ;
- fusion locale ;
- suppression/export ;
- Google et Apple seulement après stabilisation.

## Phase 6 — notifications et soutien

- préférences ;
- sélection du week-end ;
- rappels ;
- Stripe web ;
- achats intégrés mobiles ;
- webhooks idempotents.

## Phase 7 — préparation des boutiques

- confidentialité ;
- suppression de compte ;
- captures ;
- textes ;
- tests appareils ;
- monitoring ;
- bêta fermée ;
- App Store/Google Play.

## Ordre des sources

Ne pas intégrer toutes les sources à la fois. Commencer par OpenAgenda, valider le pipeline complet, puis ajouter DATAtourisme et Toulouse Open Data.

## Ce qui attend après le lancement

- contributions organisateurs ;
- collections collaboratives ;
- OneSignal si les campagnes deviennent complexes ;
- recherche dédiée si PostgreSQL ne suffit plus ;
- seconde ville uniquement après rétention démontrée à Toulouse.
