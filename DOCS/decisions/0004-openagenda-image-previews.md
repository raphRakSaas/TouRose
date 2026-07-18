# ADR 0004 — OpenAgenda image previews pending review

- Status: Accepted
- Date: 2026-07-18

## Context

OpenAgenda events often include a CDN image and an `imageCredits` field. TouRose previously
discarded these images until a full rights review, which made real events look like mock content.

## Decision

- Store OpenAgenda's remote image URL, dimensions, credit and event source URL in `media_assets`.
- Mark imported images `needs_review`; never copy them into TouRose storage automatically.
- Allow public read only for `needs_review` media whose remote URL is on
  `cdn.openagenda.com` and whose source URL is on `openagenda.com`.
- Display the credit and “OpenAgenda” source next to every preview.
- Keep all other `needs_review` media private.
- Administrators can still approve, restrict or reject each media asset.

## Consequences

- Events can immediately use their source image while preserving attribution and review status.
- Remote availability remains dependent on OpenAgenda's CDN.
- This exception does not authorize scraping images from organizers' websites. A future source
  connector may ingest an official image only when explicit license and attribution metadata are
  available.
