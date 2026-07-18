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
export type AdminPlaceInput = z.infer<typeof adminPlaceInputSchema>;
export type AdminEventInput = z.infer<typeof adminEventInputSchema>;
export type PublicPlace = z.infer<typeof publicPlaceSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
