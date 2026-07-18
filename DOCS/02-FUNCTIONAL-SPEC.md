# Spécification fonctionnelle

## 1. Accueil et recommandations

L'accueil affiche trois suggestions adaptées ainsi qu'un accès direct au catalogue complet.

### Entrées utilisateur

- moment : maintenant, aujourd'hui, ce soir, demain, ce week-end ou date personnalisée ;
- durée disponible : moins d'une heure, 1–2 h, demi-journée, journée ;
- compagnie : seul, couple, amis, famille, avec un chien ;
- budget : gratuit, moins de 10 €, moins de 25 €, indifférent ;
- transport : à pied, vélo, transports en commun, voiture ;
- environnement : intérieur, extérieur, indifférent ;
- envie : découvrir, marcher, se poser, bouger, apprendre, manger, participer.

### Résultat

Trois cartes différentes :

1. meilleur choix global ;
2. alternative économique ou gratuite ;
3. proposition inattendue.

Chaque suggestion doit afficher une courte justification : « gratuit et accessible en métro », « adapté à la météo », « à 18 minutes », etc.

### Version MVP du classement

Le moteur est déterministe et fondé sur des scores : compatibilité temporelle, distance, budget, météo, préférences, fraîcheur, diversité et qualité éditoriale. Aucune IA générative n'est nécessaire.

## 2. Catalogue des événements

- liste complète ;
- vue carte ;
- filtres par date, catégorie, prix, distance, public, intérieur/extérieur ;
- recherche textuelle ;
- tri par pertinence, date et distance ;
- événements terminés exclus par défaut ;
- statut annulé ou reporté visible ;
- lien vers la source officielle.

## 3. Catalogue des lieux

Types initiaux :

- monument ;
- musée ;
- place ou quartier ;
- parc ou jardin ;
- balade ;
- point de vue ;
- activité ;
- lieu culturel ;
- site historique ;
- bon plan permanent.

Filtres : gratuité, accessibilité, enfants, chiens, intérieur/extérieur, transport et distance.

## 4. Fiche événement

- titre ;
- image avec crédit ;
- résumé ;
- description ;
- dates et horaires ;
- lieu ;
- distance ;
- prix et conditions ;
- catégories ;
- public ;
- accessibilité si connue ;
- source et dernière vérification ;
- bouton vers la page officielle ;
- ajouter aux favoris ;
- ajouter au calendrier ;
- partager ;
- signaler une erreur.

## 5. Fiche lieu

- nom ;
- images et crédits ;
- description éditoriale ;
- intérêt du lieu ;
- adresse et coordonnées ;
- horaires si fiables ;
- coût ;
- durée conseillée ;
- accessibilité ;
- transports ;
- enfants et chiens ;
- intérieur/extérieur ;
- meilleur moment ;
- événements associés ;
- source et licence ;
- favori, visité, partage et signalement.

## 6. Recherche

La recherche couvre événements, lieux, catégories et collections. Elle doit :

- ignorer les accents et la casse ;
- tolérer de petites fautes ;
- favoriser les éléments actifs et proches ;
- permettre des filtres combinés ;
- afficher un état vide utile.

## 7. Favoris et historique

Sans compte, les données sont conservées localement. Avec un compte, elles sont synchronisées.

- favoris ;
- à découvrir ;
- visité/réalisé ;
- date de visite facultative ;
- préférences ;
- historique des suggestions consultées pour limiter les répétitions.

La fusion local-vers-cloud doit être idempotente et ne jamais supprimer silencieusement les données locales.

## 8. Collections

Collections éditoriales, par exemple :

- Toulouse gratuitement ;
- première semaine à Toulouse ;
- sorties quand il pleut ;
- fraîcheur et lieux ombragés ;
- promenades sans voiture ;
- Toulouse en amoureux ;
- monuments incontournables ;
- petits coins moins connus.

## 9. Notifications

- sélection du week-end ;
- rappel d'un événement favori ;
- événement modifié ou annulé ;
- nouvelle collection pertinente.

Consentement explicite, préférences granulaires et désinscription immédiate.

## 10. Soutien

- présentation des trois montants ;
- aucun avantage fonctionnel ;
- confirmation et remerciement ;
- achats consommables sur mobile ;
- Stripe Checkout sur le site.

## 11. Signalement

Types : date incorrecte, événement annulé, lieu fermé, information incorrecte, image litigieuse, autre. Le signalement crée une entrée de modération sans modifier directement la fiche.

## 12. Administration

- tableau de fraîcheur des imports ;
- liste des erreurs ;
- consultation et édition des événements et lieux ;
- publication, masquage et archivage ;
- gestion des doublons ;
- gestion des sources, licences et crédits ;
- collections éditoriales ;
- recommandations mises en avant ;
- signalements ;
- notifications ;
- journal d'audit.

## Règles essentielles

- Un événement importé reste lié à sa source et son identifiant externe.
- Une mise à jour ne doit pas écraser une correction éditoriale sans arbitrage.
- Tout élément publié doit avoir au moins une source.
- Toute image publiée doit avoir un statut juridique documenté.
- Un événement expiré est archivé, jamais supprimé immédiatement.
- Les horaires inconnus ne doivent jamais être inventés.
