# ADR 0002 — Phase 1 catalogue admin CRUD and public read path

- Status: Accepted
- Date: 2026-07-18

## Context

Phase 1 requires an administrator to publish places/events that become visible on mobile and website, plus basic search.

## Decision

- Keep media assets out of Phase 1 (deferred to later when licensing pipeline exists).
- Expose public read via `public_places`, existing `public_events`, `list_*` RPCs and `search_public_catalog`.
- Enforce admin writes with `is_admin()` (JWT `app_metadata.role = admin`) + RLS + `admin_save_place` / `admin_save_event` RPCs for PostGIS lat/lng mapping.
- Seed a **local-only** admin user (`admin@tourose.local`) for Docker development.
- Clients validate rows with `@tourose/contracts` Zod schemas (snake_case matching PostgREST).

## Consequences

- Admin UX guard remains non-authoritative; RLS is the security boundary.
- Website catalogue is fetched at request/build time from Supabase; static production will need SSR/ISR later for freshness.
- Local admin password must never be reused in hosted environments.
