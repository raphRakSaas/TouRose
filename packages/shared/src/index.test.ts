import { describe, expect, it } from 'vitest';
import {
  distanceFromToulouseCenter,
  formatRelativeDayLabel,
  hashPayload,
  normalizeOpenAgendaEvent,
  slugify,
} from './index';

describe('shared utilities', () => {
  it('computes near-zero distance at Toulouse center', () => {
    expect(distanceFromToulouseCenter(43.6045, 1.444)).toBeLessThan(0.01);
  });

  it('formats today label in French', () => {
    const now = new Date('2026-07-18T10:00:00.000Z');
    expect(formatRelativeDayLabel(now.toISOString(), now)).toBe("Aujourd'hui");
  });

  it('slugifies OpenAgenda titles', () => {
    expect(slugify('Balade Garonne (DÉMO)!')).toBe('balade-garonne-demo');
  });

  it('hashes payloads stably regardless of key order', async () => {
    expect(await hashPayload({ b: 2, a: 1 })).toBe(await hashPayload({ a: 1, b: 2 }));
  });

  it('normalizes an OpenAgenda event into import payload', async () => {
    const normalized = await normalizeOpenAgendaEvent(
      {
        uid: 42,
        title: { fr: 'Concert test' },
        description: { fr: 'Résumé' },
        status: 2,
        updatedAt: '2026-07-18T12:00:00.000Z',
        location: {
          uid: 7,
          name: 'Place du Capitole',
          city: 'Toulouse',
          latitude: 43.6,
          longitude: 1.44,
        },
        timings: [{ begin: '2026-08-01T20:00:00+02:00', end: '2026-08-01T22:00:00+02:00' }],
      },
      { agendaUid: '999' },
    );

    expect(normalized.external_id).toBe('42');
    expect(normalized.status).toBe('published');
    expect(normalized.slug.startsWith('oa-42-')).toBe(true);
    expect(normalized.place?.external_id).toBe('7');
    expect(normalized.occurrences).toHaveLength(1);
    expect(normalized.payload_hash.length).toBe(64);
  });
});
