# Modèle de données

Ce document décrit le modèle conceptuel. Les migrations SQL restent la source exécutable de vérité.

## Extensions PostgreSQL

- `postgis` ;
- `unaccent` ;
- `pg_trgm` ;
- `pg_cron` ;
- `pg_net` si nécessaire ;
- `pgcrypto`.

## Entités principales

### `territories`

Prépare l'extension future sans complexifier l'interface : `id`, `slug`, `name`, `timezone`, `boundary`, `is_active`.

### `sources`

`id`, `name`, `kind`, `base_url`, `license_name`, `license_url`, `attribution_template`, `terms_url`, `is_active`, `last_reviewed_at`.

### `places`

`id`, `territory_id`, `slug`, `name`, `summary`, `description`, `place_type`, `location geography(Point,4326)`, `address`, `postal_code`, `city`, `website_url`, `phone`, `price_type`, `price_details`, `indoor_outdoor`, `recommended_duration_minutes`, `family_friendly`, `dog_friendly`, `accessible`, `status`, `published_at`, `last_verified_at`, timestamps.

### `events`

`id`, `territory_id`, `place_id`, `slug`, `title`, `summary`, `description`, `location geography(Point,4326)` pour les événements sans lieu, `price_type`, `price_details`, `booking_url`, `official_url`, `indoor_outdoor`, `family_friendly`, `accessible`, `status`, `published_at`, `last_verified_at`, timestamps.

### `event_occurrences`

Sépare l'événement de ses horaires : `id`, `event_id`, `starts_at`, `ends_at`, `timezone`, `doors_at`, `status`, `booking_status`.

### `categories`

`id`, `slug`, `name`, `parent_id`, `icon`, `color_token`, `is_active`.

### Tables de liaison

- `event_categories` ;
- `place_categories` ;
- `collection_items`.

### `media_assets`

`id`, `storage_path`, `remote_url`, `mime_type`, dimensions, `alt_text`, `author`, `source_url`, `license_name`, `license_url`, `attribution_text`, `cache_permission`, `rights_status`, `reviewed_at`.

### `entity_media`

Association polymorphe contrôlée : `entity_type`, `entity_id`, `media_id`, `position`, `is_cover`.

### `external_records`

Lien import : `id`, `source_id`, `entity_type`, `entity_id`, `external_id`, `external_url`, `payload jsonb`, `payload_hash`, `first_seen_at`, `last_seen_at`, `last_imported_at`, `source_updated_at`.

Contrainte unique sur `(source_id, entity_type, external_id)`.

### `editorial_overrides`

Préserve les corrections locales face aux imports : `entity_type`, `entity_id`, `field_name`, `value jsonb`, `reason`, `created_by`, timestamps.

### `collections`

`id`, `territory_id`, `slug`, `title`, `summary`, `description`, `cover_media_id`, `status`, `starts_at`, `ends_at`, `sort_mode`.

### Utilisateurs

- `profiles` : lié à `auth.users`, pseudonyme facultatif, territoire et préférences minimales ;
- `user_favorites` ;
- `user_visits` ;
- `user_preferences` ;
- `recommendation_impressions` ;
- `push_subscriptions` ;
- `notification_preferences`.

### Exploitation

- `reports` ;
- `import_runs` ;
- `import_errors` ;
- `audit_logs` ;
- `notification_campaigns` ;
- `notification_deliveries` ;
- `support_payments` sans données de carte.

## Statuts

Événement : `draft`, `published`, `cancelled`, `postponed`, `archived`, `hidden`.

Lieu : `draft`, `published`, `temporarily_closed`, `permanently_closed`, `archived`, `hidden`.

Média : `unknown`, `allowed`, `restricted`, `rejected`, `needs_review`.

## Index essentiels

- GiST sur toutes les colonnes géographiques ;
- B-tree sur dates, statuts et clés étrangères ;
- GIN sur vecteurs de recherche ;
- trigrammes sur noms et titres ;
- index partiels sur contenus publiés et occurrences futures ;
- unicité des slugs par territoire et type.

## Vues/API publiques

Ne pas exposer les tables brutes si une vue limitée suffit :

- `public_events` ;
- `public_places` ;
- `public_collections` ;
- fonctions RPC de recherche et de recommandation.

Les vues ne doivent jamais révéler payloads bruts, journaux, e-mails, jetons push ou notes internes.

## RLS

- catalogue publié : lecture anonyme ;
- profils et données personnelles : propriétaire uniquement ;
- administration : rôle vérifié ;
- imports : service role uniquement ;
- signalements : insertion contrôlée, lecture admin ;
- médias : lecture publique uniquement si autorisés et associés à un contenu publié.
