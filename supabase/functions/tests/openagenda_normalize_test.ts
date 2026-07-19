import {
  buildOpenAgendaEventDetails,
  hashPayload,
  localizeText,
  mapOpenAgendaPriceType,
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
    'types-devenements': [24, 45],
    participation: [42],
    longDescription: { fr: '**Programme complet** de la soirée.' },
    conditions: { fr: 'Plein tarif 12 €, réduit 8 €' },
    accessibility: { mi: true, vi: false },
    age: { min: 6, max: 120 },
    attendanceMode: 1,
    keywords: { fr: ['concert', 'plein air'] },
    registration: [
      { type: 'link', value: 'https://billetterie.example.com/e/42' },
      { type: 'phone', value: '05 61 00 00 00' },
    ],
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
  if (normalized.category_slugs.join(',') !== 'spectacle,visite') {
    throw new Error('category slugs');
  }
  if (normalized.price_type !== 'free') {
    throw new Error('price_type free via participation');
  }
  if (normalized.description !== '**Programme complet** de la soirée.') {
    throw new Error('description should use longDescription');
  }
  if (normalized.details.conditions !== 'Plein tarif 12 €, réduit 8 €') {
    throw new Error('details.conditions');
  }
  if (normalized.details.age_min !== 6) throw new Error('details.age_min');
  if (normalized.details.accessibility.join(',') !== 'mi') {
    throw new Error('details.accessibility keeps only enabled codes');
  }
  if (normalized.details.attendance_mode !== 'onsite') {
    throw new Error('details.attendance_mode');
  }
  if (normalized.details.keywords.join(',') !== 'concert,plein air') {
    throw new Error('details.keywords');
  }
  if (normalized.details.registration.length !== 2) {
    throw new Error('details.registration');
  }
});

Deno.test('buildOpenAgendaEventDetails tolerates missing fields', () => {
  const details = buildOpenAgendaEventDetails({ uid: 1 });
  if (details.accessibility.length !== 0) throw new Error('accessibility default');
  if (details.keywords.length !== 0) throw new Error('keywords default');
  if (details.registration.length !== 0) throw new Error('registration default');
  if (details.conditions !== undefined) throw new Error('conditions default');
});

Deno.test('mapOpenAgendaPriceType covers free, paid and unknown', () => {
  if (mapOpenAgendaPriceType({ participation: [42] }) !== 'free') {
    throw new Error('participation 42');
  }
  if (mapOpenAgendaPriceType({ entreelibre: [1] }) !== 'free') {
    throw new Error('entreelibre 1');
  }
  if (
    mapOpenAgendaPriceType({ billetterie: 'https://billetterie.example.com/e/1' }) !== 'paid'
  ) {
    throw new Error('billetterie url');
  }
  if (
    mapOpenAgendaPriceType({
      participation: [42],
      billetterie: 'https://billetterie.example.com/e/1',
    }) !== 'free'
  ) {
    throw new Error('free wins over ticket url');
  }
  if (mapOpenAgendaPriceType({}) !== 'unknown') {
    throw new Error('unknown default');
  }
});
