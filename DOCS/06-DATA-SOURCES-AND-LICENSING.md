# Sources, imports et licences

## Sources prévues

### OpenAgenda

- événements publics ;
- API authentifiée ;
- licence ouverte selon les agendas et conditions applicables ;
- conserver agenda, identifiant, URL, dates et image/crédit ;
- prix dérivé à l’import : `participation` (entrée libre/gratuite) ou legacy `entreelibre` → `free` ; URL `billetterie` → `paid` ; sinon `unknown` ;
- catégories dérivées du champ agenda `types-devenements` (Spectacle, Visite, Exposition…) ;
- import en mode `detailed=1` : `longDescription` (markdown) → `events.description`, et `events.details` (jsonb) regroupe `conditions` (tarifs), `age`, `accessibility` (hi/ii/mi/pi/vi), `attendanceMode`, `onlineAccessLink`, `keywords` et `registration` (lien/téléphone/email).
- les `location` OpenAgenda créent des lieux `cultural_venue` pour rattacher les événements ;
  **ils n’alimentent pas** le catalogue Explorer « Lieux » (voir ADR 0006).

### Catalogue lieux découverte (éditorial TouRose)

- parcs, monuments, places, balades, points de vue, activités, sites historiques, bons plans ;
- contenus rédigés / curés TouRose (source `TouRose Editorial Places`) ;
- détails riches : description, durée, gratuit/payant, famille, chiens, accessibilité, tips/accès ;
- `list_public_places(discovery_only := true)` exclut `cultural_venue` et peut trier par proximité GPS ;
- photos via Wikimedia Commons avec attribution : `pnpm import:editorial-photos`
  (catégorie Commons curée par lieu, plus fiable pour les monuments) ou
  `pnpm import:wikimedia-places` (recherche floue générique) ; un lieu sans catégorie
  fiable reste sans photo plutôt que d’afficher une image erronée.

### DATAtourisme

- lieux, activités et points d'intérêt ;
- API publique ;
- conserver producteur, source, identifiant et licence de chaque donnée.

### Toulouse Métropole Open Data

- parcs, équipements et jeux de données locaux ;
- licence généralement ODbL sur le portail ;
- attribution précise du jeu, producteur et date ;
- vérifier la licence au niveau de chaque jeu.

### Wikimedia Commons

- photographies sous licence libre ou domaine public ;
- licence et auteur propres à chaque fichier ;
- utiliser l'API et non du scraping fragile ;
- l’import local `pnpm import:wikimedia-places` recherche strictement le nom du lieu avec
  « Toulouse », vérifie les mots distinctifs du fichier, conserve au maximum trois photos
  et refuse tout média sans auteur, licence ou URL de licence ;
- les médias acceptés conservent l’URL Commons, l’auteur, la licence, son URL et le texte
  d’attribution ; aucun fichier n’est copié localement.

### Archives de Toulouse

- documents historiques libres de droits ou sous licence ouverte ;
- vérifier les restrictions au document, pas seulement au portail.

### OpenStreetMap

- données cartographiques ODbL ;
- attribution visible ;
- ne pas utiliser les serveurs de tuiles communautaires comme CDN de production ;
- fournisseur de tuiles conforme et configurable ;
- l’onglet Carte mobile utilise MapLibre GL JS (WebView) avec les tuiles vectorielles
  [OpenFreeMap](https://openfreemap.org) (gratuites, usage production autorisé) ;
  l’attribution OSM est affichée par le contrôle MapLibre intégré.

### Open-Meteo

- météo contextuelle ;
- mettre en cache ;
- afficher la source dans les crédits.

## Règle absolue pour les images

Une image accessible publiquement n'est pas automatiquement réutilisable. Aucune image n'est publiée sans :

- source ;
- auteur lorsque requis ;
- licence ;
- URL de licence ;
- statut de droit ;
- texte d'attribution ;
- décision explicite sur la mise en cache.

En cas de doute : ne pas copier, utiliser un visuel de remplacement et placer l'élément en revue.

Exception de prévisualisation OpenAgenda (ADR 0004) : une URL distante du CDN OpenAgenda peut
être affichée sans copie locale avec son crédit et sa source, sous le statut `needs_review`.
Cette exception ne s'applique à aucun autre domaine et ne vaut pas validation définitive des droits.

## Pipeline d'import

1. récupérer avec curseur/pagination ;
2. enregistrer le payload brut et son hash ;
3. valider le schéma de la source ;
4. normaliser dates, textes, coordonnées et prix ;
5. lier ou créer le lieu ;
6. détecter les doublons ;
7. appliquer les corrections éditoriales ;
8. contrôler publication et droits médias ;
9. journaliser le résultat ;
10. archiver les éléments disparus après délai de sécurité.

## Déduplication

Ordre de confiance : identifiant externe identique, URL officielle, même titre/lieu/date, puis score de similarité. Aucun rapprochement incertain ne doit fusionner destructivement deux éléments ; créer une suggestion de fusion pour l'administration.

## Fraîcheur

- événements : import toutes les 3 à 6 heures ;
- lieux : hebdomadaire ;
- vérification des éléments proches : plus fréquente ;
- expiration automatique après la dernière occurrence ;
- alerte si une source n'a pas été importée avec succès dans son délai attendu.

## Corrections éditoriales

Les champs corrigés manuellement sont stockés comme overrides. Un import ultérieur met à jour le brut mais ne remplace pas silencieusement la valeur éditoriale.

## Retrait

Prévoir un contact et un processus permettant à un titulaire de droits ou organisateur de demander correction ou retrait. Conserver un journal de la décision.
