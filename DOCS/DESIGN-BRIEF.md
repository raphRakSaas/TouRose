# Brief design — TouRose

Document autonome à transmettre à **Claude Design** (ou tout designer).  
Objectif : produire l’identité visuelle et les maquettes de l’expérience TouRose, en priorité **mobile**, puis site public et admin.

Date : 2026-07-18  
Statut produit : Phase 1 technique en cours (catalogue admin + lecture mobile/web). Le design peut et doit viser le **MVP complet** décrit ici, pas seulement l’existant code.

---

## 1. Mission du designer

Concevoir une identité et une UI **chaleureuse, contemporaine, éditoriale et locale** pour une app de découverte de Toulouse.

Livrables attendus (par priorité) :

1. **Direction artistique** : moodboard, principes, do / don’t.
2. **Identité** : logo / wordmark TouRose, variantes clair/sombre si besoin, favicon, icône app.
3. **Design system léger** : couleurs, typo, espaces, rayons, ombres, composants (boutons, chips, cards suggestion, listes, états vides…).
4. **Maquettes mobile haute fidélité** (iPhone + Android sensiblement identiques) pour tous les écrans MVP ci-dessous, y compris états.
5. **Maquettes site** (accueil, catalogue, confidentialité, crédits, soutien).
6. **Maquettes admin** (shell, login, listes, formulaires) — plus sobres, outil de travail.
7. **Spécifications** : tailles tactiles, contrastes, comportements responsive, notes d’accessibilité.
8. **Assets exportables** : icônes, placeholders image, motifs subtils si utilisés.

Le design doit pouvoir être implémenté ensuite en React Native (Expo + NativeWind) et Astro/Angular avec des **tokens CSS/JS partagés**.

---

## 2. Le produit en une phrase

**TouRose** aide habitants, nouveaux arrivants et visiteurs à choisir **quoi faire à Toulouse**, maintenant ou plus tard.

> **Trois idées adaptées à ta situation, puis tout Toulouse à portée de main.**

Signature officielle :

> **Toulouse à voir, à vivre, à aimer.**

### Histoire fondatrice (ton)

Le créateur et sa compagne déménagent à Toulouse pour une nouvelle vie. TouRose est l’app qu’ils voudraient vraiment utiliser ensemble : événements, parcs, monuments, lieux historiques, activités, promenades, bons plans.

Le ton doit être **humain, curieux, chaleureux, local** — jamais institutionnel, administratif, ni « office de tourisme froid ».

### Problème

Les infos locales sont dispersées. Les catalogues exhaustifs **surchargent** : beaucoup de résultats, aucune décision.

### Proposition

1. **Inspire-moi** : exactement **trois** suggestions justifiées (pas une liste infinie).
2. **Tout explorer** : catalogue complet filtrable (événements, lieux, collections) toujours accessible.

---

## 3. Publics cibles

| Persona | Besoin design |
| --- | --- |
| **Nouvel arrivant** | Rassurant, clair, « première semaine à Toulouse », pas intimidant |
| **Couple local** | Idées rapides le soir / week-end, favoris visibles |
| **Habitant curieux** | Lieux moins évidents, éditorial soigné |
| **Visiteur** | Immédiat, sans compte, suggestions actionnables |

**Compte facultatif** partout : aucune barrière login sur le parcours principal.

---

## 4. Plateformes à designer

| Surface | Priorité | Nature |
| --- | --- | --- |
| **App mobile iOS/Android** | P0 | Cœur produit — Expo / React Native |
| **Site web public** | P1 | Landing, catalogue, légal, soutien Stripe |
| **Admin web** | P2 | Outil interne — clair, dense, sobre (pas marketing) |

---

## 5. Navigation mobile (figée)

Barre inférieure **4 onglets** :

1. **Aujourd’hui** — recommandations + raccourcis  
2. **Explorer** — catalogue + recherche  
3. **Carte** — découverte géo  
4. **Pour moi** — favoris, préférences, compte, soutien  

Recherche globale accessible depuis Aujourd’hui et Explorer.

---

## 6. Écrans à maquetter (MVP)

### 6.1 Onboarding léger (skippable)

- Histoire + promesse TouRose  
- Choix de centres d’intérêt (chips)  
- Explication localisation **avant** la boîte système iOS/Android  
- Tout est passable  
- **Aucun** écran de création de compte obligatoire  

### 6.2 Aujourd’hui (écran héros)

Contenu du premier viewport (garder simple) :

- Marque **TouRose** bien visible (signal de marque, pas juste dans la nav)  
- Salutation contextuelle (tutoiement)  
- Météo synthétique  
- Sélecteur de moment (maintenant / aujourd’hui / ce soir / demain / week-end / date)  
- **Trois cartes de suggestion** (cœur de l’écran)  
- CTA « Affiner mes envies »  
- Raccourcis : Gratuit · Dehors · Ce week-end · Autour de moi  
- Plus bas : nouveautés / collection éditoriale  

**Les trois suggestions** doivent être visuellement distinctes par rôle :

1. Meilleur choix global  
2. Alternative économique / gratuite  
3. Proposition inattendue  

Chaque carte : image (ou placeholder), titre, 1 phrase de **justification** explicable (« gratuit et accessible en métro », « adapté à la météo », « à 18 min »).

### 6.3 Affiner mes envies

Feuille / bottom sheet / écran avec :

- durée : &lt;1 h · 1–2 h · demi-journée · journée  
- compagnie : seul · couple · amis · famille · avec un chien  
- budget : gratuit · &lt;10 € · &lt;25 € · indifférent  
- transport : à pied · vélo · transports · voiture  
- environnement : intérieur · extérieur · indifférent  
- envie : découvrir · marcher · se poser · bouger · apprendre · manger · participer  

Filtres actifs visibles + reset facile.

### 6.4 Explorer

- Champ recherche  
- Segments : Événements · Lieux · Collections  
- Filtres (date, catégorie, prix, distance, public, intérieur/extérieur…)  
- Liste longue (virtualisée)  
- États : chargement, erreur, vide, hors-ligne  

### 6.5 Carte

- Marqueurs différenciés événement vs lieu  
- Clustering  
- Panneau détail au tap  
- Recentrage  
- Filtres alignés Explorer  
- **Attribution cartographique toujours visible**  

### 6.6 Fiche événement

Ordre : image + crédit → titre → infos décisives (quand, où, prix, distance) → actions (favori, calendrier, partager, lien officiel) → description → pratique → mini-carte → source + dernière vérification → signaler.

Statuts visibles : annulé, reporté, terminé.

### 6.7 Fiche lieu

Même logique : image, intérêt du lieu, adresse, durée conseillée, gratuité, accessibilité, enfants/chiens, intérieur/extérieur, meilleur moment, événements associés, source/licence, favori / visité / partager / signaler.

### 6.8 Pour moi

- Favoris · À découvrir · Déjà visité  
- Préférences  
- Notifications  
- Compte / sync (optionnel)  
- Soutenir TouRose (3 montants humoristiques locaux)  
- Sources, licences, confidentialité, contact  

### 6.9 Soutien (mobile + site)

Trois montants, **aucun avantage fonctionnel** :

| Montant | Nom | Phrase |
| --- | --- | --- |
| 1 € | Une gorgée de café | « De quoi garder le créateur éveillé pendant trois lignes de code. » |
| 5 € | Une chocolatine de compétition | « Oui, ici on dit chocolatine. Tu viens de financer une pause très toulousaine. » |
| 10 € | Une brique rose | « Une brique symbolique pour construire la prochaine fonctionnalité. » |

Écran de remerciement chaleureux.

### 6.10 Site web

- **Accueil** : marque dominante, signature, promesse, CTA catalogue / app  
- **Catalogue** : listes événements / lieux publiés  
- **Confidentialité** (placeholder clair pour l’instant)  
- **Crédits / sources**  
- SEO : titres, meta, structure claire  

### 6.11 Admin (outil)

- Login  
- Dashboard  
- Listes lieux / événements  
- Formulaires édition + statut draft/published  
- Esthétique **sobre et efficace**, même famille de couleurs mais moins éditoriale / moins photo  

---

## 7. États UX obligatoires (à designer explicitement)

Pour les listes et fiches au minimum :

- Squelette de chargement  
- Erreur récupérable (retry)  
- Hors-ligne + cache  
- Vide utile (« élargis ta recherche »)  
- Données potentiellement obsolètes  
- Image manquante → placeholder de marque  
- Localisation refusée → saisie manuelle  
- Événement annulé / terminé  

---

## 8. Direction visuelle

### Inspiration

- Brique toulousaine / terre cuite  
- Lumière chaude du Sud-Ouest  
- Garonne (eau, reflets)  
- Violette de Toulouse (accent, pas dominante criarde)  

### À faire

- Photographie locale généreuse (quand droits OK)  
- Cartes / surfaces arrondies **mais sobres**  
- Densité maîtrisée : le contenu prime  
- Identité joyeuse **sans** devenir enfantine  
- Marque forte sur le premier viewport mobile et landing  

### À éviter absolument

- Rose bonbon / Barbie  
- Esthétique « mairie » / institutionnelle grise  
- Look générique startup IA : violet-sur-blanc / indigo glow / glassmorphism excessif  
- Fond crème générique + serif terracotta « template AI » (le terracotta ici doit être **spécifiquement brique toulousaine**, pas un cliché neutre)  
- Dashboard overload sur l’accueil  
- Trop de pills, badges flottants, stickers promo sur le hero  
- Cards partout sans nécessité d’interaction  
- Emojis comme identité visuelle  

### Accessibilité

- WCAG **AA** contraste  
- Texte dynamique (Dynamic Type)  
- Zones tactiles ≥ **44×44** pt  
- Pas d’info par la couleur seule  
- Respect `prefers-reduced-motion`  
- Alt text pour images éditoriales  

### Motion

2–3 motions intentionnelles max au départ, par ex. :

- apparition des 3 suggestions  
- transition feuille « Affiner »  
- feedback favori  

Pas de bruit animationnel.

---

## 9. Tokens déjà proposés dans le code (point de départ, affinage bienvenu)

Le monorepo a déjà `packages/design-tokens`. Claude Design peut **affiner**, mais rester dans cette famille.

### Couleurs

| Famille | Rôle | Exemple 500 |
| --- | --- | --- |
| **brick** | Primaire marque / CTA | `#C45C3E` |
| **garonne** | Secondaire / liens / eau | `#3A7A88` |
| **violet** | Accent rare (violette) | `#8B5EAD` |
| **sand** | Fonds chauds | 50 `#FBF8F4` |
| **ink** | Texte | 800 `#1F1C19` |
| sémantique | success `#2F7D4A` · warning `#C47A1A` · danger `#B33A2B` | |

Échelles complètes 50–900 disponibles dans le code pour brick / garonne / violet / sand / ink.

### Typographie actuelle (ouverte à meilleure paire)

- **Display / marque** : Fraunces (serif expressive)  
- **Body** : Source Sans 3  
- **Mono** (admin / technique) : IBM Plex Mono  

Préférer des polices expressives ; **éviter** Inter / Roboto / Arial comme identité.

### Espacements

Grille 4 pt : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64…

### Rayons

`sm 6` · `md 10` · `lg 16` · `xl 24` (pas de « pill everywhere »)

### Ombres

Douces, peu nombreuses : soft / medium — pas de multi-layer glow.

---

## 10. Contenu & copy (voix)

- **Tutoiement**  
- Phrases courtes  
- Local (« chocolatine », brique rose) avec humour léger  
- Pas de jargon touristique (« patrimoine exceptionnel et pluriel… »)  
- Toujours créditer sources et images  

Exemples de justifications de suggestion :

- « gratuit et accessible en métro »  
- « adapté à la météo »  
- « à 18 minutes à pied »  
- « idéal en couple ce soir »  

---

## 11. Types de contenu à représenter en UI

**Événements** : titres, dates, prix, statut, lieu, distance, catégories.

**Lieux** : monument, musée, place/quartier, parc/jardin, balade, point de vue, activité, lieu culturel, site historique, bon plan permanent.

**Collections éditoriales** (exemples) :

- Toulouse gratuitement  
- Première semaine à Toulouse  
- Sorties quand il pleut  
- Fraîcheur et lieux ombragés  
- Promenades sans voiture  
- Toulouse en amoureux  
- Monuments incontournables  
- Petits coins moins connus  

---

## 12. Hors périmètre design (ne pas inventer)

Ne pas maquetter comme features MVP :

- réseau social, chat, groupes, commentaires publics  
- billetterie propriétaire, marketplace  
- navigation randonnée GPS  
- assistant IA conversationnel  
- expansion multi-villes dans l’UI  
- publication libre organisateurs  

---

## 13. Contraintes techniques utiles au design

- Mobile : React Native + Expo Router + NativeWind (utility classes proches Tailwind)  
- Site : Astro + Tailwind (souvent statique)  
- Admin : Angular + Tailwind  
- Tokens partagés entre les trois  
- Listes longues = virtualisées → éviter layouts impossibles à virtualiser  
- Images : toujours prévoir crédit + fallback ; beaucoup d’images réelles seront sous licence — placeholders de marque importants  

État code actuel (indicatif, ne limite pas le design MVP) :

- 4 onglets mobiles placeholder / catalogue branché  
- Site : accueil, catalogue, crédits, confidentialité  
- Admin : login + CRUD lieux/événements  

---

## 14. Composition du premier viewport (règle produit/design)

Sur landing et Aujourd’hui :

- Une seule composition forte (pas un dashboard)  
- Marque héros  
- Une promesse / headline  
- Une courte phrase de soutien  
- Un groupe de CTA  
- Une image / atmosphère dominante  

Éviter dans le premier viewport : stats, agendas denses, adresses, promos multiples, chips en pagaille.

---

## 15. Prompt de démarrage (à coller dans Claude Design)

```text
Tu es designer produit pour TouRose, une app mobile de découverte locale à Toulouse.

Promesse : « Trois idées adaptées à ta situation, puis tout Toulouse à portée de main. »
Signature : « Toulouse à voir, à vivre, à aimer. »

Ton : chaleureux, curieux, local, tutoiement. Histoire de couple qui emménage à Toulouse.

Identité : brique toulousaine, Garonne, violette en accent. Contemporain éditorial, pas mairie, pas rose bonbon, pas look startup violet générique.

Navigation mobile figée : Aujourd’hui, Explorer, Carte, Pour moi.

Cœur UX : l’écran Aujourd’hui montre exactement 3 suggestions justifiées + accès au catalogue complet. Compte jamais obligatoire.

Produis :
1) direction artistique + moodboard
2) logo / wordmark
3) design system (couleurs, typo, composants)
4) maquettes haute fidélité des écrans MVP listés dans le brief (avec états chargement/erreur/vide/hors-ligne)
5) landing web + admin sobre

Accessibilité WCAG AA, zones 44pt, contenu prioritaire sur la décoration.
Référence tokens existants brick #C45C3E, garonne #3A7A88, violet #8B5EAD, fond sand #FBF8F4, texte ink #1F1C19 ; typo Fraunces + Source Sans 3 (affinage OK).
```

---

## 16. Critères d’acceptation design

Le travail est bon si :

- On reconnaît Toulouse / TouRose sans lire le nom (brique + chaleur + local)  
- Les 3 suggestions sont le héros évident d’Aujourd’hui  
- Explorer / Carte / Pour moi sont cohérents et calmes  
- Les états vides/erreur sont aussi soignés que le happy path  
- Le site et l’admin partagent la famille visuelle sans confondre marketing et outil  
- Un développeur peut extraire tokens + specs sans ambiguïté  

---

## 17. Documents source (si besoin d’approfondir)

Dans le repo TouRose :

- `docs/01-PRODUCT-VISION.md`  
- `docs/02-FUNCTIONAL-SPEC.md`  
- `docs/03-UX-AND-SCREENS.md`  
- `packages/design-tokens/` (tokens code)  
- `README.md`  

Ce fichier (`docs/DESIGN-BRIEF.md`) reste le **point d’entrée unique** pour Claude Design.
