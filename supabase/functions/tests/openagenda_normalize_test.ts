import {
  hashPayload,
  localizeText,
  normalizeOpenAgendaEvent,
  slugify,
  type OpenAgendaEvent,
} from '../import-openagenda/normalize.ts';

Deno.test('slugify strips accents and punctuation', () => {
  if (slugify('Balade Garonne (DÉMO)!') !== 'balade-garonne-demo') {
    throw new Error(`unexpected slug: ${slugify('Balade Garonne (DÉMO)!')}`);
  }
});

Deno.test('localizeText prefers French', () => {
  const localized = localizeText({ fr: 'Bonjour', en: 'Hello' });
  if (localized !== 'Bonjour') {
    throw new Error(localized);
  }
});

Deno.test('hashPayload is stable for key order', async () => {
  const firstHash = await hashPayload({ b: 2, a: 1 });
  const secondHash = await hashPayload({ a: 1, b: 2 });
  if (firstHash !== secondHash) {
    throw new Error('hash not stable');
  }
});

Deno.test('normalizeOpenAgendaEvent maps fixture shape', async () => {
  const eventRow: OpenAgendaEvent = {
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
    image: {
      base: 'https://cdn.openagenda.com/main/',
      filename: 'event.base.jpg',
      variants: [
        {
          type: 'full',
          filename: 'event.full.jpg',
          size: { width: 500, height: 375 },
        },
      ],
    },
    imageCredits: 'Photographe test',
  };

  const normalized = await normalizeOpenAgendaEvent(eventRow, { agendaUid: '999' });
  if (normalized.external_id !== '42') throw new Error('external_id');
  if (normalized.status !== 'published') throw new Error('status');
  if (!normalized.slug.startsWith('oa-42-')) throw new Error('slug');
  if (!normalized.place || normalized.place.external_id !== '7') throw new Error('place');
  if (normalized.occurrences.length !== 1) throw new Error('occurrences');
  if (!normalized.payload_hash) throw new Error('hash');
  if (normalized.image?.remote_url !== 'https://cdn.openagenda.com/main/event.full.jpg') {
    throw new Error('image url');
  }
  if (normalized.image.attribution_text !== 'Photo : Photographe test · OpenAgenda') {
    throw new Error('image attribution');
  }
});
