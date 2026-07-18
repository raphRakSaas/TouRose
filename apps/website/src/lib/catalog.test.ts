import { describe, expect, it } from 'vitest';

import { publicEventRowSchema } from '@tourose/contracts';

describe('catalog contracts bridge', () => {
  it('accepts a published event row shape', () => {
    const parsed = publicEventRowSchema.parse({
      id: '55555555-5555-5555-5555-555555555501',
      slug: 'demo',
      title: 'Demo',
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
    expect(parsed.slug).toBe('demo');
  });
});
