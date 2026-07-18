import { describe, expect, it } from 'vitest';
import {
  catalogSearchHitSchema,
  healthCheckSchema,
  importRunRowSchema,
  publicCollectionRowSchema,
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

  it('validates a public collection row', () => {
    const collectionRow = publicCollectionRowSchema.parse({
      id: '66666666-6666-6666-6666-666666666601',
      slug: 'toulouse-demo-gratuit',
      title: 'Gratuit à Toulouse (DÉMO)',
      summary: 'Collection seed',
      status: 'published',
      starts_at: null,
      ends_at: null,
    });
    expect(collectionRow.slug).toBe('toulouse-demo-gratuit');
  });

  it('validates an import run row', () => {
    const runRow = importRunRowSchema.parse({
      id: '77777777-7777-7777-7777-777777777701',
      source_id: '22222222-2222-2222-2222-222222222201',
      status: 'succeeded',
      correlation_id: 'corr-1',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      fetched_count: 2,
      created_count: 2,
      updated_count: 0,
      skipped_count: 0,
      error_count: 0,
      message: 'Fixture mode',
    });
    expect(runRow.status).toBe('succeeded');
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
