# UX, navigation et écrans

## Ton

Chaleureux, curieux, local et concis. Tutoiement. Éviter le jargon touristique et les formulations administratives.

## Navigation mobile

Barre inférieure à quatre onglets :

1. **Aujourd'hui** — recommandations et accès rapide.
2. **Explorer** — événements, lieux, catégories et collections.
3. **Carte** — découverte géographique.
4. **Pour moi** — favoris, visites, préférences et compte.

La recherche globale est accessible depuis Aujourd'hui et Explorer.

## Écrans MVP

### Onboarding léger

- histoire et promesse ;
- choix de quelques centres d'intérêt ;
- autorisation de localisation expliquée avant la boîte système ;
- possibilité de passer chaque étape ;
- aucune création de compte.

### Aujourd'hui

- salutation contextuelle ;
- météo synthétique ;
- sélecteur de moment ;
- trois suggestions ;
- bouton « Affiner mes envies » ;
- raccourcis vers gratuit, dehors, ce week-end et autour de moi ;
- nouveautés et collection éditoriale.

### Affiner

Feuille ou écran avec durée, compagnie, budget, transport, environnement et envie. Les filtres choisis doivent être visibles et faciles à réinitialiser.

### Explorer

- champ de recherche ;
- segments Événements, Lieux, Collections ;
- filtres ;
- liste virtuelle ;
- états chargement, erreur, hors-ligne et vide.

### Carte

- groupes de marqueurs ;
- différenciation événement/lieu ;
- panneau de détail au toucher ;
- bouton de recentrage ;
- filtres cohérents avec Explorer ;
- attribution cartographique toujours visible.

### Détails

Hiérarchie : image, titre, informations décisives, actions, description, informations pratiques, carte, source et crédits.

### Pour moi

- favoris ;
- à découvrir ;
- déjà visité ;
- préférences ;
- notifications ;
- synchronisation/compte ;
- soutenir TouRose ;
- sources, licences, confidentialité et contact.

## États UX obligatoires

- squelette de chargement ;
- erreur récupérable ;
- hors-ligne avec contenu mis en cache ;
- aucun résultat avec suggestions pour élargir ;
- données potentiellement obsolètes ;
- image manquante avec visuel de remplacement ;
- autorisation de localisation refusée avec saisie manuelle ;
- événement annulé ou terminé.

## Accessibilité

- contraste WCAG AA ;
- tailles de texte dynamiques ;
- zones tactiles d'au moins 44×44 points ;
- libellés lecteurs d'écran ;
- ne pas utiliser uniquement la couleur ;
- animations respectant la réduction de mouvements ;
- ordre de navigation logique ;
- descriptions alternatives pour les images éditoriales.

## Direction visuelle à transmettre au designer

- inspiration : briques roses, terre cuite, lumière chaude, Garonne, violette ;
- éviter le rose bonbon et l'esthétique de mairie ;
- photographie locale généreuse ;
- cartes arrondies mais sobres ;
- densité maîtrisée ;
- le contenu prime sur la décoration ;
- identité joyeuse sans devenir enfantine.

## Prompt résumé pour le design

Concevoir une application mobile locale appelée TouRose, destinée à découvrir Toulouse. Elle doit être chaleureuse, contemporaine et éditoriale. Le cœur de l'accueil présente trois sorties adaptées à la situation, mais l'utilisateur peut aussi explorer tous les événements, monuments, parcs, activités et collections. Prévoir les quatre onglets Aujourd'hui, Explorer, Carte et Pour moi, ainsi que tous les états de chargement, erreur, vide, hors-ligne et permissions refusées. L'identité s'inspire de la brique toulousaine, de la Garonne et de la violette, avec une accessibilité WCAG AA.
