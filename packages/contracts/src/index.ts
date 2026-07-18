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

export const publicPlaceSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().nullable(),
  placeType: placeTypeSchema,
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  city: z.string().nullable(),
  priceType: priceTypeSchema,
  indoorOutdoor: indoorOutdoorSchema,
  status: placeStatusSchema,
  lastVerifiedAt: z.string().datetime().nullable(),
});

export const publicEventSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().nullable(),
  placeId: z.string().uuid().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  priceType: priceTypeSchema,
  indoorOutdoor: indoorOutdoorSchema,
  status: eventStatusSchema,
  nextStartsAt: z.string().datetime().nullable(),
  nextEndsAt: z.string().datetime().nullable(),
  officialUrl: z.string().url().nullable(),
  lastVerifiedAt: z.string().datetime().nullable(),
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

export type PublicPlace = z.infer<typeof publicPlaceSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type HealthCheck = z.infer<typeof healthCheckSchema>;
