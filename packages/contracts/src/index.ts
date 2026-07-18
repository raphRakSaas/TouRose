import { z } from 'zod';

export const territorySlugSchema = z.literal('toulouse');

export const priceTypeSchema = z.enum(['free', 'paid', 'donation', 'unknown']);

export const indoorOutdoorSchema = z.enum(['indoor', 'outdoor', 'mixed', 'unknown']);

export const eventStatusSchema = z.enum([
  'draft',
  'published',
  'cancelled',
  'postponed',
  'archived',
  'hidden',
]);

export const placeStatusSchema = z.enum([
  'draft',
  'published',
  'temporarily_closed',
  'permanently_closed',
  'archived',
  'hidden',
]);

export const placeTypeSchema = z.enum([
  'monument',
  'museum',
  'square',
  'park',
  'walk',
  'viewpoint',
  'activity',
  'cultural_venue',
  'historical_site',
  'permanent_tip',
]);

/** Matches `public.public_places` / `list_public_places` rows (snake_case). */
export const publicPlaceRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  place_type: placeTypeSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  city: z.string().nullable(),
  price_type: priceTypeSchema,
  indoor_outdoor: indoorOutdoorSchema,
  status: placeStatusSchema,
  last_verified_at: z.string().nullable(),
});

/** Matches `public.public_events` / `list_upcoming_public_events` rows (snake_case). */
export const publicEventRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  place_id: z.string().uuid().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  price_type: priceTypeSchema,
  indoor_outdoor: indoorOutdoorSchema,
  status: eventStatusSchema,
  next_starts_at: z.string().nullable(),
  next_ends_at: z.string().nullable(),
  official_url: z.string().nullable(),
  last_verified_at: z.string().nullable(),
});

export const catalogSearchHitSchema = z.object({
  entity_type: z.enum(['event', 'place']),
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  rank: z.number(),
});

export const mediaRightsStatusSchema = z.enum([
  'unknown',
  'allowed',
  'restricted',
  'rejected',
  'needs_review',
]);

export const publicMediaAssetSchema = z.object({
  id: z.string().uuid(),
  remote_url: z.string().nullable(),
  storage_path: z.string().nullable(),
  alt_text: z.string().nullable(),
  attribution_text: z.string().nullable(),
  license_name: z.string().nullable(),
  rights_status: mediaRightsStatusSchema,
});

export const publicCollectionRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'hidden']),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
});

export const adminPlaceInputSchema = z.object({
  id: z.string().uuid().optional(),
  territory_id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  place_type: placeTypeSchema,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  price_type: priceTypeSchema.default('unknown'),
  indoor_outdoor: indoorOutdoorSchema.default('unknown'),
  status: placeStatusSchema.default('draft'),
});

export const adminEventInputSchema = z.object({
  id: z.string().uuid().optional(),
  territory_id: z.string().uuid(),
  place_id: z.string().uuid().optional().nullable(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  price_type: priceTypeSchema.default('unknown'),
  indoor_outdoor: indoorOutdoorSchema.default('unknown'),
  official_url: z.string().url().optional().or(z.literal('')),
  status: eventStatusSchema.default('draft'),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

export const healthCheckSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  checkedAt: z.string().datetime(),
});

export const edgeFunctionErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().min(1),
});

export const importRunStatusSchema = z.enum(['running', 'succeeded', 'failed', 'partial']);

export const importRunRowSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  status: importRunStatusSchema,
  correlation_id: z.string().min(1),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  fetched_count: z.number().int(),
  created_count: z.number().int(),
  updated_count: z.number().int(),
  skipped_count: z.number().int(),
  error_count: z.number().int(),
  message: z.string().nullable(),
});

export const importErrorCodeSchema = z.enum([
  'validation',
  'normalize',
  'upsert',
  'possible_duplicate',
  'media_rights',
  'other',
]);

export const importErrorRowSchema = z.object({
  id: z.string().uuid(),
  import_run_id: z.string().uuid(),
  external_id: z.string().nullable(),
  error_code: importErrorCodeSchema,
  message: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});

export const externalRecordRowSchema = z.object({
  id: z.string().uuid(),
  source_id: z.string().uuid(),
  entity_type: z.enum(['event', 'place']),
  entity_id: z.string().uuid(),
  external_id: z.string().min(1),
  external_url: z.string().nullable(),
  payload_hash: z.string().min(1),
  last_imported_at: z.string(),
  source_updated_at: z.string().nullable(),
});

export const normalizedImportOccurrenceSchema = z.object({
  starts_at: z.string().min(1),
  ends_at: z.string().nullable().optional(),
});

export const normalizedImportPlaceSchema = z.object({
  external_id: z.string().min(1),
  external_url: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().optional(),
  place_type: placeTypeSchema.default('cultural_venue'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  payload_hash: z.string().optional(),
  status: placeStatusSchema.default('published'),
});

/** Payload accepted by RPC `import_upsert_event`. */
export const importUpsertEventPayloadSchema = z.object({
  source_id: z.string().uuid(),
  territory_id: z.string().uuid().optional(),
  external_id: z.string().min(1),
  external_url: z.string().optional(),
  payload_hash: z.string().min(1),
  raw_payload: z.record(z.string(), z.unknown()).optional(),
  source_updated_at: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  status: eventStatusSchema.default('published'),
  price_type: priceTypeSchema.default('unknown'),
  indoor_outdoor: indoorOutdoorSchema.default('unknown'),
  official_url: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  place: normalizedImportPlaceSchema.nullable().optional(),
  occurrences: z.array(normalizedImportOccurrenceSchema).default([]),
});

export const importUpsertResultSchema = z.object({
  entity_id: z.string().uuid(),
  action: z.enum(['created', 'updated', 'skipped']),
  external_id: z.string(),
  place_id: z.string().uuid().nullable().optional(),
});

/** @deprecated Prefer publicPlaceRowSchema for API rows */
export const publicPlaceSchema = publicPlaceRowSchema.transform((row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  summary: row.summary,
  placeType: row.place_type,
  latitude: row.latitude,
  longitude: row.longitude,
  city: row.city,
  priceType: row.price_type,
  indoorOutdoor: row.indoor_outdoor,
  status: row.status,
  lastVerifiedAt: row.last_verified_at,
}));

/** @deprecated Prefer publicEventRowSchema for API rows */
export const publicEventSchema = publicEventRowSchema.transform((row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  placeId: row.place_id,
  latitude: row.latitude,
  longitude: row.longitude,
  priceType: row.price_type,
  indoorOutdoor: row.indoor_outdoor,
  status: row.status,
  nextStartsAt: row.next_starts_at,
  nextEndsAt: row.next_ends_at,
  officialUrl: row.official_url,
  lastVerifiedAt: row.last_verified_at,
}));

export type PublicPlaceRow = z.infer<typeof publicPlaceRowSchema>;
export type PublicEventRow = z.infer<typeof publicEventRowSchema>;
export type CatalogSearchHit = z.infer<typeof catalogSearchHitSchema>;
export type PublicMediaAsset = z.infer<typeof publicMediaAssetSchema>;
export type PublicCollectionRow = z.infer<typeof publicCollectionRowSchema>;
export type AdminPlaceInput = z.input<typeof adminPlaceInputSchema>;
export type AdminEventInput = z.input<typeof adminEventInputSchema>;
export type PublicPlace = z.infer<typeof publicPlaceSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type ImportRunRow = z.infer<typeof importRunRowSchema>;
export type ImportErrorRow = z.infer<typeof importErrorRowSchema>;
export type ExternalRecordRow = z.infer<typeof externalRecordRowSchema>;
export type ImportUpsertEventPayload = z.input<typeof importUpsertEventPayloadSchema>;
export type ImportUpsertResult = z.infer<typeof importUpsertResultSchema>;
