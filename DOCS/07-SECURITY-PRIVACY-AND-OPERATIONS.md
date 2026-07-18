# Sécurité, confidentialité et exploitation

## Données minimales

TouRose ne collecte que ce qui est utile. La localisation précise est utilisée à la demande et ne doit pas être conservée comme historique permanent au MVP.

## Données personnelles possibles

- identifiant de compte ;
- e-mail ;
- favoris et visites ;
- préférences ;
- jeton push ;
- signalements ;
- événements techniques pseudonymisés.

## RGPD

- consentement clair pour notifications et analytics non essentiels ;
- politique de confidentialité accessible sans compte ;
- export des données ;
- suppression du compte et des données ;
- durées de conservation documentées ;
- registre des sous-traitants ;
- aucune vente de données ;
- adresse de contact dédiée.

## Secrets

- aucun secret dans Git ;
- fichiers `.env.example` sans valeurs sensibles ;
- secrets de production dans les gestionnaires des plateformes ;
- clés client publiques clairement distinguées des clés serveur ;
- rotation documentée ;
- service role interdit dans les applications clientes.

## Sécurité Supabase

- RLS activée avant exposition ;
- tests automatisés des politiques ;
- schéma privé pour données internes ;
- fonctions `security definer` rares, auditées et avec `search_path` fixé ;
- validation Zod à l'entrée des Edge Functions ;
- limites de taille et pagination ;
- rate limiting sur signalements et endpoints sensibles.

## Administration

- MFA recommandée ;
- contrôle de rôle serveur ;
- journal d'audit des publications, corrections et suppressions ;
- aucune action destructive sans confirmation ;
- archivage privilégié à la suppression.

## Sauvegardes

- sauvegardes automatiques du plan de production ;
- export périodique de la base ;
- sauvegarde séparée des objets Storage ;
- exercice de restauration documenté ;
- migration testée avant production.

## Disponibilité

- clients tolérants aux erreurs et au hors-ligne ;
- imports idempotents ;
- retries avec backoff ;
- circuit de désactivation d'une source ;
- statut de fraîcheur visible ;
- page de statut interne dans l'administration.

## Budgets et quotas

- alertes de consommation Supabase, tuiles, stockage, météo et monitoring ;
- limites par utilisateur et par adresse réseau sur actions sensibles ;
- images redimensionnées ;
- pagination systématique ;
- aucun appel API externe par ligne affichée.

## Incidents

Documenter : détection, confinement, rotation des secrets, communication, restauration et rétrospective. Ne jamais inclure de secret ou donnée personnelle dans un ticket public.
