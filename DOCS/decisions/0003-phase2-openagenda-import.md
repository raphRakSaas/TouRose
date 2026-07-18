# ADR 0003 — Phase 2 OpenAgenda import pipeline

- Status: Accepted
- Date: 2026-07-18

## Context

Phase 2 requires an idempotent, observable OpenAgenda import that can be corrected from the admin, without publishing images without rights review.

## Decision

- Persist raw linkage in `external_records` (unique `source_id + entity_type + external_id`) with `payload_hash` for skip-if-unchanged.
- Journal each run in `import_runs` / `import_errors` (admin-readable via RLS + `is_admin()`).
- Preserve editorial corrections in `editorial_overrides`; `import_upsert_event` applies them so imports never silently overwrite.
- Run the pipeline in Edge Function `import-openagenda` with `IMPORT_CRON_SECRET` (service role for DB writes). Local default uses **fixtures** when `OPENAGENDA_PUBLIC_KEY` is absent.
- Never auto-publish OpenAgenda images (`media_rights` log only).
- Soft duplicates are logged as `possible_duplicate` without destructive merge.

## Consequences

- Admin `/imports` is functional (not design-polished) for freshness and manual trigger.
- DATAtourisme / Toulouse Open Data / production cron remain follow-ups.
- Production must set real secrets (`IMPORT_CRON_SECRET`, OpenAgenda key + agenda UID) outside the repo.
