import { describe, expect, it } from 'vitest';
import { healthCheckSchema, publicEventSchema } from './index';

describe('contracts', () => {
  it('validates a health payload', () => {
    const payload = healthCheckSchema.parse({
      status: 'ok',
      service: 'tourose-health',
      checkedAt: new Date().toISOString(),
    });
    expect(payload.service).toBe('tourose-health');
  });

  it('rejects an invalid event slug', () => {
    const result = publicEventSchema.safeParse({
      id: 'not-a-uuid',
      slug: '',
      title: 'Test',
      summary: null,
      placeId: null,
      latitude: null,
      longitude: null,
      priceType: 'free',
      indoorOutdoor: 'outdoor',
      status: 'published',
      nextStartsAt: null,
      nextEndsAt: null,
      officialUrl: null,
      lastVerifiedAt: null,
    });
    expect(result.success).toBe(false);
  });
});
