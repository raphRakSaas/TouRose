import { describe, expect, it } from 'vitest';
import {
  catalogSearchHitSchema,
  healthCheckSchema,
  publicEventRowSchema,
  publicPlaceRowSchema,
} from './index';

describe('contracts', () => {
  it('validates a health payload', () => {
    const payload = healthCheckSchema.parse({
      status: 'ok',
      service: 'tourose-health',
      checkedAt: new Date().toISOString(),
    });
    expect(payload.service).toBe('tourose-health');
  });

  it('validates a public place row', () => {
    const place = publicPlaceRowSchema.parse({
      id: '44444444-4444-4444-4444-444444444401',
      slug: 'jardin-fictif',
      name: 'Jardin fictif',
      summary: 'Démo',
      place_type: 'park',
      latitude: 43.6,
      longitude: 1.44,
      city: 'Toulouse',
      price_type: 'free',
      indoor_outdoor: 'outdoor',
      status: 'published',
      last_verified_at: new Date().toISOString(),
    });
    expect(place.place_type).toBe('park');
  });

  it('validates a public event row', () => {
    const eventRow = publicEventRowSchema.parse({
      id: '55555555-5555-5555-5555-555555555501',
      slug: 'balade',
      title: 'Balade',
      summary: null,
      place_id: null,
      latitude: null,
      longitude: null,
      price_type: 'free',
      indoor_outdoor: 'outdoor',
      status: 'published',
      next_starts_at: new Date().toISOString(),
      next_ends_at: null,
      official_url: null,
      last_verified_at: null,
    });
    expect(eventRow.title).toBe('Balade');
  });

  it('validates a search hit', () => {
    const hit = catalogSearchHitSchema.parse({
      entity_type: 'place',
      id: '44444444-4444-4444-4444-444444444401',
      slug: 'jardin',
      title: 'Jardin',
      summary: null,
      rank: 0.8,
    });
    expect(hit.entity_type).toBe('place');
  });

  it('rejects an invalid event slug', () => {
    const result = publicEventRowSchema.safeParse({
      id: 'not-a-uuid',
      slug: '',
      title: 'Test',
      summary: null,
      place_id: null,
      latitude: null,
      longitude: null,
      price_type: 'free',
      indoor_outdoor: 'outdoor',
      status: 'published',
      next_starts_at: null,
      next_ends_at: null,
      official_url: null,
      last_verified_at: null,
    });
    expect(result.success).toBe(false);
  });
});
