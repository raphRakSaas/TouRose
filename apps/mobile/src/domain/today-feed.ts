import { distanceFromToulouseCenter, formatRelativeDayLabel } from '@tourose/shared';
import type { PublicEventRow } from '@tourose/contracts';

export type MomentKey = 'tonight' | 'today' | 'weekend' | 'custom-date';

export type PriceFilterKey = 'all' | 'free' | 'paid';

export type CategorySectionKey = 'forYou' | 'nearby' | 'free' | 'hike' | 'visit' | 'museum';

export type FeedItem = {
  id: string;
  title: string;
  reason: string;
  badge: string;
  badgeColor: string;
  href: string;
  photoIndex: number;
  priceType: string;
  latitude: number | null;
  longitude: number | null;
  nextStartsAt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
};

export type FeedSection = {
  key: CategorySectionKey;
  title: string;
  items: FeedItem[];
};

export type MomentRange = { start: Date; end: Date };

export type TodayFeedFilters = {
  moment: MomentKey;
  customDate?: Date;
  price: PriceFilterKey;
  /** Si défini, ne garde que cette section (hors liste « tous »). */
  category: CategorySectionKey | 'all';
};

const HIKE_KEYWORDS = [
  'randonnée',
  'randonnee',
  'balade',
  'marche',
  'chemin',
  'sentier',
  'trek',
  'hiking',
];

const VISIT_KEYWORDS = [
  'visite',
  'visites',
  'visiter',
  'guidée',
  'guidee',
  'patrimoine',
  'monument',
  'château',
  'chateau',
];

const MUSEUM_KEYWORDS = [
  'musée',
  'musee',
  'museum',
  'exposition',
  'expo ',
  'galerie',
  'collection',
];

const SECTION_META: Record<
  CategorySectionKey,
  { title: string; badge: string; badgeColor: string }
> = {
  forYou: { title: 'Pour toi', badge: 'Pour toi', badgeColor: '#A94A30' },
  nearby: { title: 'Proximité', badge: 'Proche', badgeColor: '#26525C' },
  free: { title: 'Gratuit', badge: 'Gratuit', badgeColor: '#2F7D4A' },
  hike: { title: 'Randonnée', badge: 'Balade', badgeColor: '#A88B63' },
  visit: { title: 'Visite', badge: 'Visite', badgeColor: '#5D3B77' },
  museum: { title: 'Musée', badge: 'Musée', badgeColor: '#8B5EAD' },
};

export function getMomentRange(moment: MomentKey, now: Date, customDate?: Date): MomentRange {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  switch (moment) {
    case 'tonight': {
      const eveningStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
      return { start: now > eveningStart ? now : eveningStart, end: endOfDay(now) };
    }
    case 'today':
      return { start: now, end: endOfDay(now) };
    case 'weekend': {
      const dayOfWeek = now.getDay();
      const daysUntilSaturday = dayOfWeek === 0 ? -1 : 6 - dayOfWeek;
      const saturday = startOfDay(
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday),
      );
      const sunday = endOfDay(
        new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1),
      );
      return { start: now > saturday ? now : saturday, end: sunday };
    }
    case 'custom-date': {
      const targetDate = customDate ?? now;
      const start = startOfDay(targetDate);
      return { start: now > start ? now : start, end: endOfDay(targetDate) };
    }
  }
}

export function isEventInRange(eventRow: PublicEventRow, range: MomentRange): boolean {
  if (!eventRow.next_starts_at) {
    return false;
  }
  const startsAt = new Date(eventRow.next_starts_at);
  return startsAt >= range.start && startsAt <= range.end;
}

export function matchesKeywords(text: string, keywords: string[]): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return keywords.some((keyword) => {
    const needle = keyword
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalized.includes(needle);
  });
}

export function eventSearchText(eventRow: PublicEventRow): string {
  return `${eventRow.title} ${eventRow.summary ?? ''}`;
}

export function classifyEventCategory(eventRow: PublicEventRow): CategorySectionKey[] {
  const text = eventSearchText(eventRow);
  const categories: CategorySectionKey[] = [];
  if (eventRow.price_type === 'free') {
    categories.push('free');
  }
  if (matchesKeywords(text, HIKE_KEYWORDS)) {
    categories.push('hike');
  }
  if (matchesKeywords(text, VISIT_KEYWORDS)) {
    categories.push('visit');
  }
  if (matchesKeywords(text, MUSEUM_KEYWORDS)) {
    categories.push('museum');
  }
  return categories;
}

function sortByStartDate(events: PublicEventRow[]): PublicEventRow[] {
  return [...events]
    .filter((eventRow) => eventRow.next_starts_at)
    .sort(
      (first, second) =>
        new Date(first.next_starts_at as string).getTime() -
        new Date(second.next_starts_at as string).getTime(),
    );
}

function sortByDistance(events: PublicEventRow[]): PublicEventRow[] {
  return [...events].sort((first, second) => {
    const firstDistance =
      first.latitude != null && first.longitude != null
        ? distanceFromToulouseCenter(first.latitude, first.longitude)
        : Number.POSITIVE_INFINITY;
    const secondDistance =
      second.latitude != null && second.longitude != null
        ? distanceFromToulouseCenter(second.latitude, second.longitude)
        : Number.POSITIVE_INFINITY;
    return firstDistance - secondDistance;
  });
}

function applyPriceFilter(events: PublicEventRow[], price: PriceFilterKey): PublicEventRow[] {
  if (price === 'all') {
    return events;
  }
  if (price === 'free') {
    return events.filter((eventRow) => eventRow.price_type === 'free');
  }
  return events.filter((eventRow) => eventRow.price_type !== 'free');
}

function applyDateFilter(
  events: PublicEventRow[],
  moment: MomentKey,
  now: Date,
  customDate?: Date,
): PublicEventRow[] {
  const range = getMomentRange(moment, now, customDate);
  const inRange = events.filter((eventRow) => isEventInRange(eventRow, range));
  // Fallback : si rien ne colle à la fenêtre, on garde les prochains à venir.
  return inRange.length > 0 ? inRange : sortByStartDate(events);
}

function eventReason(eventRow: PublicEventRow, now: Date): string {
  const parts: string[] = [];
  if (eventRow.next_starts_at) {
    const dayLabel = formatRelativeDayLabel(eventRow.next_starts_at, now);
    const timeLabel = new Date(eventRow.next_starts_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    parts.push(`${dayLabel} à ${timeLabel}`);
  }
  if (eventRow.price_type === 'free') {
    parts.push('gratuit');
  }
  return parts.length > 0 ? parts.join(' · ') : (eventRow.summary ?? 'À découvrir');
}

function toFeedItem(
  eventRow: PublicEventRow,
  now: Date,
  sectionKey: CategorySectionKey,
  photoIndex: number,
): FeedItem {
  const meta = SECTION_META[sectionKey];
  return {
    id: eventRow.id,
    title: eventRow.title,
    reason: eventReason(eventRow, now),
    badge: meta.badge,
    badgeColor: meta.badgeColor,
    href: `/event/${eventRow.slug}`,
    photoIndex,
    priceType: eventRow.price_type,
    latitude: eventRow.latitude,
    longitude: eventRow.longitude,
    nextStartsAt: eventRow.next_starts_at,
    imageUrl: eventRow.image_url ?? null,
    imageAlt: eventRow.image_alt ?? null,
    imageAttribution: eventRow.image_attribution ?? null,
    imageSourceUrl: eventRow.image_source_url ?? null,
  };
}

/**
 * Trois picks « Pour toi » : prochain, un gratuit distinct, un 3e pour variété.
 */
export function pickForYouEvents(events: PublicEventRow[], now: Date): PublicEventRow[] {
  const upcoming = sortByStartDate(events);
  const picks: PublicEventRow[] = [];
  const usedIds = new Set<string>();

  const first = upcoming[0];
  if (first) {
    picks.push(first);
    usedIds.add(first.id);
  }

  const freePick = upcoming.find(
    (eventRow) => eventRow.price_type === 'free' && !usedIds.has(eventRow.id),
  );
  if (freePick) {
    picks.push(freePick);
    usedIds.add(freePick.id);
  }

  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const remaining = upcoming.filter((eventRow) => !usedIds.has(eventRow.id));
  if (remaining.length > 0) {
    picks.push(remaining[dayOfYear % remaining.length]);
  }

  return picks.slice(0, 3);
}

export function buildTodayFeed(
  events: PublicEventRow[],
  options: {
    now: Date;
    filters: TodayFeedFilters;
  },
): { sections: FeedSection[]; allEvents: FeedItem[]; forYouPicks: FeedItem[] } {
  const { now, filters } = options;
  const dated = applyDateFilter(events, filters.moment, now, filters.customDate);
  const priced = applyPriceFilter(dated, filters.price);
  const upcoming = sortByStartDate(priced);

  const forYouEvents = pickForYouEvents(upcoming, now);
  const forYouPicks = forYouEvents.map((eventRow, index) =>
    toFeedItem(eventRow, now, 'forYou', index),
  );

  const nearbyEvents = sortByDistance(upcoming).slice(0, 12);
  const freeEvents = upcoming.filter((eventRow) => eventRow.price_type === 'free').slice(0, 12);
  const hikeEvents = upcoming
    .filter((eventRow) => matchesKeywords(eventSearchText(eventRow), HIKE_KEYWORDS))
    .slice(0, 12);
  const visitEvents = upcoming
    .filter((eventRow) => matchesKeywords(eventSearchText(eventRow), VISIT_KEYWORDS))
    .slice(0, 12);
  const museumEvents = upcoming
    .filter((eventRow) => matchesKeywords(eventSearchText(eventRow), MUSEUM_KEYWORDS))
    .slice(0, 12);

  const rawSections: { key: CategorySectionKey; events: PublicEventRow[] }[] = [
    { key: 'forYou', events: forYouEvents },
    { key: 'nearby', events: nearbyEvents },
    { key: 'free', events: freeEvents },
    { key: 'hike', events: hikeEvents },
    { key: 'visit', events: visitEvents },
    { key: 'museum', events: museumEvents },
  ];

  const sections = rawSections
    .filter((section) => section.events.length > 0)
    .filter((section) => filters.category === 'all' || filters.category === section.key)
    .map((section) => ({
      key: section.key,
      title: SECTION_META[section.key].title,
      items: section.events.map((eventRow, index) => toFeedItem(eventRow, now, section.key, index)),
    }));

  const allEvents = upcoming.map((eventRow, index) => toFeedItem(eventRow, now, 'forYou', index));

  return { sections, allEvents, forYouPicks };
}

export function formatCustomDateLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** @deprecated Conservé pour compat tests / imports anciens — préférer buildTodayFeed. */
export type QuickFilterKey = 'free' | 'outdoor' | 'weekend' | 'nearby';

export function applyQuickFilters<T extends { price_type: string; indoor_outdoor: string }>(
  rows: T[],
  activeFilters: ReadonlySet<QuickFilterKey>,
): T[] {
  return rows.filter((row) => {
    if (activeFilters.has('free') && row.price_type !== 'free') {
      return false;
    }
    if (
      activeFilters.has('outdoor') &&
      row.indoor_outdoor !== 'outdoor' &&
      row.indoor_outdoor !== 'mixed'
    ) {
      return false;
    }
    return true;
  });
}
