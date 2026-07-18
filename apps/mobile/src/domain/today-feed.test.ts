import type { PublicEventRow } from '@tourose/contracts';

import {
  buildTodayFeed,
  classifyEventCategory,
  getMomentRange,
  isEventInRange,
  matchesKeywords,
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

describe('matchesKeywords / classifyEventCategory', () => {
  it('détecte randonnée / balade', () => {
    expect(matchesKeywords('Grande balade sur les quais', ['balade'])).toBe(true);
    expect(classifyEventCategory(makeEvent({ title: 'Randonnée en forêt' }))).toContain('hike');
  });

  it('détecte musée / exposition', () => {
    expect(classifyEventCategory(makeEvent({ title: 'Exposition au musée' }))).toEqual(
      expect.arrayContaining(['museum']),
    );
  });

  it('détecte visite guidée', () => {
    expect(classifyEventCategory(makeEvent({ title: 'Visite guidée du Capitole' }))).toContain(
      'visit',
    );
  });

  it('marque le gratuit', () => {
    expect(classifyEventCategory(makeEvent({ price_type: 'free' }))).toContain('free');
  });
});

describe('pickForYouEvents / buildTodayFeed', () => {
  const concert = makeEvent({
    id: '55555555-5555-5555-5555-555555555501',
    slug: 'concert',
    title: 'Concert',
    next_starts_at: '2026-07-18T19:00:00',
  });
  const balade = makeEvent({
    id: '55555555-5555-5555-5555-555555555502',
    slug: 'balade-gratuite',
    title: 'Balade gratuite',
    price_type: 'free',
    next_starts_at: '2026-07-19T10:00:00',
  });
  const musee = makeEvent({
    id: '55555555-5555-5555-5555-555555555503',
    slug: 'expo-musee',
    title: 'Exposition au musée',
    price_type: 'paid',
    next_starts_at: '2026-07-19T14:00:00',
  });
  const visite = makeEvent({
    id: '55555555-5555-5555-5555-555555555504',
    slug: 'visite-guidée',
    title: 'Visite guidée',
    next_starts_at: '2026-07-19T11:00:00',
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
    expect(sections.some((section) => section.key === 'hike')).toBe(true);
    expect(sections.some((section) => section.key === 'museum')).toBe(true);
    expect(sections.some((section) => section.key === 'visit')).toBe(true);
    expect(allEvents.length).toBeGreaterThan(0);
  });

  it('filtre par prix gratuit', () => {
    const { allEvents } = buildTodayFeed([concert, balade, musee], {
      now: NOW,
      filters: { moment: 'weekend', price: 'free' as PriceFilterKey, category: 'all' },
    });
    expect(allEvents.every((item) => item.priceType === 'free')).toBe(true);
  });

  it('filtre une seule catégorie', () => {
    const { sections } = buildTodayFeed([concert, balade, musee, visite], {
      now: NOW,
      filters: { moment: 'weekend', price: 'all', category: 'museum' },
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('museum');
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
