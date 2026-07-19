import type { PublicEventRow } from '@tourose/contracts';

import {
  buildTodayFeed,
  eventCategorySlugs,
  getMomentRange,
  isEventInRange,
  pickForYouEvents,
  type PriceFilterKey,
} from './today-feed';

const NOW = new Date('2026-07-18T14:00:00');

function makeEvent(overrides: Partial<PublicEventRow>): PublicEventRow {
  return {
    id: '55555555-5555-5555-5555-555555555501',
    slug: 'event-test',
    title: 'Événement test',
    summary: null,
    place_id: null,
    latitude: 43.6,
    longitude: 1.44,
    price_type: 'paid',
    indoor_outdoor: 'outdoor',
    status: 'published',
    next_starts_at: '2026-07-18T19:00:00.000Z',
    next_ends_at: null,
    official_url: null,
    last_verified_at: null,
    categories: [],
    details: {},
    upcoming_occurrences: [],
    ...overrides,
  };
}

describe('getMomentRange', () => {
  it('tonight couvre 18h à minuit', () => {
    const range = getMomentRange('tonight', NOW);
    expect(range.start.getHours()).toBe(18);
    expect(range.end.getHours()).toBe(23);
  });

  it('weekend vise le week-end suivant en semaine', () => {
    const wednesday = new Date('2026-07-15T10:00:00');
    const range = getMomentRange('weekend', wednesday);
    expect(range.start.getDay()).toBe(6);
    expect(range.start.getDate()).toBe(18);
  });

  it('custom-date couvre le jour choisi', () => {
    const chosen = new Date('2026-07-25T00:00:00');
    const range = getMomentRange('custom-date', NOW, chosen);
    expect(range.start.getDate()).toBe(25);
    expect(range.end.getDate()).toBe(25);
  });
});

describe('isEventInRange', () => {
  it('accepte un événement dans la fenêtre', () => {
    const range = getMomentRange('today', NOW);
    expect(isEventInRange(makeEvent({ next_starts_at: '2026-07-18T19:00:00' }), range)).toBe(
      true,
    );
  });

  it('rejette un événement hors fenêtre', () => {
    const range = getMomentRange('today', NOW);
    expect(isEventInRange(makeEvent({ next_starts_at: '2026-08-01T19:00:00' }), range)).toBe(
      false,
    );
  });
});

describe('eventCategorySlugs', () => {
  it('renvoie les catégories OpenAgenda de l’événement', () => {
    expect(eventCategorySlugs(makeEvent({ categories: ['spectacle', 'visite'] }))).toEqual([
      'spectacle',
      'visite',
    ]);
  });

  it('renvoie un tableau vide si aucune catégorie', () => {
    expect(eventCategorySlugs(makeEvent({ categories: [] }))).toEqual([]);
  });
});

describe('pickForYouEvents / buildTodayFeed', () => {
  const concert = makeEvent({
    id: '55555555-5555-5555-5555-555555555501',
    slug: 'concert',
    title: 'Concert',
    next_starts_at: '2026-07-18T19:00:00',
    categories: ['spectacle'],
  });
  const balade = makeEvent({
    id: '55555555-5555-5555-5555-555555555502',
    slug: 'balade-gratuite',
    title: 'Balade gratuite',
    price_type: 'free',
    next_starts_at: '2026-07-19T10:00:00',
    categories: ['visite'],
  });
  const musee = makeEvent({
    id: '55555555-5555-5555-5555-555555555503',
    slug: 'expo-musee',
    title: 'Exposition au musée',
    price_type: 'paid',
    next_starts_at: '2026-07-19T14:00:00',
    categories: ['exposition'],
  });
  const visite = makeEvent({
    id: '55555555-5555-5555-5555-555555555504',
    slug: 'visite-guidée',
    title: 'Visite guidée',
    next_starts_at: '2026-07-19T11:00:00',
    categories: ['visite'],
  });

  it('choisit jusqu’à 3 picks Pour toi', () => {
    const picks = pickForYouEvents([concert, balade, musee], NOW);
    expect(picks).toHaveLength(3);
    expect(picks[0].title).toBe('Concert');
  });

  it('construit les sections et masque les vides', () => {
    const { sections, allEvents, forYouPicks } = buildTodayFeed(
      [concert, balade, musee, visite],
      {
        now: NOW,
        filters: { moment: 'weekend', price: 'all', category: 'all' },
      },
    );

    expect(forYouPicks.length).toBeGreaterThan(0);
    expect(sections.some((section) => section.key === 'forYou')).toBe(true);
    expect(sections.some((section) => section.key === 'exposition')).toBe(true);
    expect(sections.some((section) => section.key === 'visite')).toBe(true);
    expect(allEvents.length).toBeGreaterThan(0);
  });

  it('filtre par prix gratuit', () => {
    const { allEvents } = buildTodayFeed([concert, balade, musee], {
      now: NOW,
      filters: { moment: 'weekend', price: 'free' as PriceFilterKey, category: 'all' },
    });
    expect(allEvents.every((item) => item.priceType === 'free')).toBe(true);
  });

  it('filtre une seule catégorie (liste sans carrousels)', () => {
    const { sections, allEvents } = buildTodayFeed([concert, balade, musee, visite], {
      now: NOW,
      filters: { moment: 'weekend', price: 'all', category: 'exposition' },
    });
    expect(sections).toHaveLength(0);
    expect(allEvents).toHaveLength(1);
    expect(allEvents[0].categories).toContain('exposition');
  });

  it('utilise les picks scorés quand fournis', () => {
    const { forYouPicks } = buildTodayFeed([concert, balade, musee], {
      now: NOW,
      filters: { moment: 'weekend', price: 'all', category: 'all' },
      scoredPicks: [
        {
          slot: 'best',
          score: 80,
          reasons: [{ code: 'time', label: 'Bientôt', weight: 20 }],
          event: concert,
        },
      ],
    });
    expect(forYouPicks[0].reason).toContain('Bientôt');
  });

  it('renvoie vide sans événements', () => {
    const feed = buildTodayFeed([], {
      now: NOW,
      filters: { moment: 'today', price: 'all', category: 'all' },
    });
    expect(feed.sections).toEqual([]);
    expect(feed.allEvents).toEqual([]);
    expect(feed.forYouPicks).toEqual([]);
  });
});
