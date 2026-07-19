# ADR 0006 — Discovery places catalog (not OpenAgenda venues)

- Status: Accepted
- Date: 2026-07-19

## Context

Explorer « Lieux » was populated by OpenAgenda event locations (`cultural_venue`).
Those rows are useful as event venues but are not the product surface users expect:
symbolic places, parks, viewpoints, walks and permanent tips curated for discovery.

## Decision

- Keep OpenAgenda location upserts as `cultural_venue` for event linking only.
- Treat discovery catalogue as editorial (+ future Open Data / DATAtourisme imports).
- `list_public_places(..., discovery_only := true)` excludes `cultural_venue` by default.
- Optional `origin_latitude` / `origin_longitude` sort results by PostGIS distance.
- Seed an editorial corpus of Toulouse discovery places with original TouRose copy,
  practical details (`details` jsonb), duration and accessibility flags.
- Photos remain Wikimedia Commons (or other licensed sources), never scraped.

## Consequences

- Explorer and public search show discovery places, not event halls.
- Event detail pages still resolve OA venues via `place_id`.
- Volume growth comes from Open Data / DATAtourisme / admin editorial, not OA.
- Local demo fictional parks remain discovery types and may still appear in lists.
