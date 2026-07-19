# ADR 0005 — Deterministic recommendation scoring

## Status

Accepted — 2026-07-19

## Context

TouRose needs three “Pour toi” suggestions with structured reasons (time, distance, budget,
preferences, weather, editorial), without generative AI. Client-side heuristics were not enough
once OpenAgenda volume grew.

## Decision

- Store configurable weights in `recommendation_weights`.
- Expose `score_public_event_recommendations(payload jsonb)` returning up to 3 picks:
  `best`, `eco` (free), `unexpected` (different primary category).
- Log privacy-friendly impressions via `log_recommendation_impression` (event ids + reasons,
  optional anonymous `session_hash`, no user id).
- Mobile Aujourd’hui consumes the RPC and falls back to local `pickForYouEvents` if empty/error.

## Consequences

- Scoring is deterministic and testable in SQL.
- Weight tuning does not require an app release.
- MapLibre interactive map remains a development-build concern; the map tab ships a
  geolocated list + attribution until a styled MapLibre client is rebuilt.
