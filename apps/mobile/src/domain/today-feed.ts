import { distanceFromToulouseCenter, formatRelativeDayLabel } from '@tourose/shared';
import type { PublicEventRow, RecommendationPick } from '@tourose/contracts';

export type MomentKey = 'tonight' | 'today' | 'weekend' | 'custom-date';

export type PriceFilterKey = 'all' | 'free' | 'paid';

/** Slugs des catégories OpenAgenda (« types d'événements »). */
export type EventCategorySlug =
  | 'spectacle'
  | 'visite'
  | 'atelier'
  | 'exposition'
  | 'cinema'
  | 'festival'
  | 'conference'
  | 'sport'
  | 'marche'
  | 'congres'
  | 'reunion-publique';

/** Sections curées par TouRose (indépendantes des catégories OpenAgenda). */
export type CuratedSectionKey = 'forYou' | 'nearby' | 'free';

export type CategoryFilterKey = 'all' | EventCategorySlug;

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
  categories: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  imageAttribution: string | null;
  imageSourceUrl: string | null;
};

export type FeedSection = {
  key: string;
  title: string;
  items: FeedItem[];
};

export type MomentRange = { start: Date; end: Date };

export type TodayFeedFilters = {
  moment: MomentKey;
  customDate?: Date;
  price: PriceFilterKey;
  /** Si défini (≠ all), ne garde que les événements de cette catégorie. */
  category: CategoryFilterKey;
};

/** Catalogue d'affichage des catégories OpenAgenda (libellé + couleur du badge). */
export const EVENT_CATEGORIES: {
  slug: EventCategorySlug;
  label: string;
  color: string;
}[] = [
  { slug: 'spectacle', label: 'Spectacle & Musique', color: '#A94A30' },
  { slug: 'visite', label: 'Visite', color: '#26525C' },
  { slug: 'atelier', label: 'Stage & Atelier', color: '#A88B63' },
  { slug: 'exposition', label: 'Exposition', color: '#8B5EAD' },
  { slug: 'cinema', label: 'Cinéma', color: '#5D3B77' },
  { slug: 'festival', label: 'Fête & Festival', color: '#C2410C' },
  { slug: 'conference', label: 'Conférence', color: '#3F6B74' },
  { slug: 'sport', label: 'Sport', color: '#2F7D4A' },
  { slug: 'marche', label: 'Foire & Marché', color: '#B45309' },
  { slug: 'congres', label: 'Congrès & Salon', color: '#475569' },
  { slug: 'reunion-publique', label: 'Réunion publique', color: '#64748B' },
];

const CATEGORY_BY_SLUG = new Map(EVENT_CATEGORIES.map((category) => [category.slug, category]));

const DEFAULT_BADGE = { label: 'Sortie', color: '#A94A30' };

const CURATED_SECTION_META: Record<
  CuratedSectionKey,
  { title: string; badge: string; badgeColor: string }
> = {
  forYou: { title: 'Pour toi', badge: 'Pour toi', badgeColor: '#A94A30' },
  nearby: { title: 'Proximité', badge: 'Proche', badgeColor: '#26525C' },
  free: { title: 'Gratuit', badge: 'Gratuit', badgeColor: '#2F7D4A' },
};

/** Nombre maximum de carrousels de catégories affichés sur la page d'accueil. */
const MAX_CATEGORY_SECTIONS = 6;
const MAX_ITEMS_PER_SECTION = 12;

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

export function eventCategorySlugs(eventRow: PublicEventRow): string[] {
  return eventRow.categories ?? [];
}

/** Libellé + couleur du badge à partir de la première catégorie connue de l'événement. */
function primaryCategoryBadge(eventRow: PublicEventRow): { label: string; color: string } {
  for (const slug of eventCategorySlugs(eventRow)) {
    const category = CATEGORY_BY_SLUG.get(slug as EventCategorySlug);
    if (category) {
      return { label: category.label, color: category.color };
    }
  }
  return DEFAULT_BADGE;
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

function applyCategoryFilter(
  events: PublicEventRow[],
  category: CategoryFilterKey,
): PublicEventRow[] {
  if (category === 'all') {
    return events;
  }
  return events.filter((eventRow) => eventCategorySlugs(eventRow).includes(category));
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
  badge: string,
  badgeColor: string,
  photoIndex: number,
): FeedItem {
  return {
    id: eventRow.id,
    title: eventRow.title,
    reason: eventReason(eventRow, now),
    badge,
    badgeColor,
    href: `/event/${eventRow.slug}`,
    photoIndex,
    priceType: eventRow.price_type,
    latitude: eventRow.latitude,
    longitude: eventRow.longitude,
    nextStartsAt: eventRow.next_starts_at,
    categories: eventCategorySlugs(eventRow),
    imageUrl: eventRow.image_url ?? null,
    imageAlt: eventRow.image_alt ?? null,
    imageAttribution: eventRow.image_attribution ?? null,
    imageSourceUrl: eventRow.image_source_url ?? null,
  };
}

/**
 * Trois picks « Pour toi » : prochain, un gratuit distinct, un 3e pour variété.
 * Conservé comme fallback local si la RPC scoring est indisponible.
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

/** Convertit les picks scorés (RPC Phase 4) en FeedItem avec raison structurée. */
export function recommendationPicksToFeedItems(
  picks: RecommendationPick[],
  now: Date,
): FeedItem[] {
  const forYouMeta = CURATED_SECTION_META.forYou;
  return picks.map((pick, index) => {
    const primaryReason = pick.reasons[0]?.label;
    const item = toFeedItem(
      pick.event,
      now,
      forYouMeta.badge,
      forYouMeta.badgeColor,
      index,
    );
    return {
      ...item,
      reason: primaryReason
        ? `${primaryReason} · ${item.reason}`
        : item.reason,
    };
  });
}

export function buildTodayFeed(
  events: PublicEventRow[],
  options: {
    now: Date;
    filters: TodayFeedFilters;
    /** Picks scorés Phase 4 ; sinon fallback heuristique locale. */
    scoredPicks?: RecommendationPick[];
  },
): { sections: FeedSection[]; allEvents: FeedItem[]; forYouPicks: FeedItem[] } {
  const { now, filters, scoredPicks } = options;
  const dated = applyDateFilter(events, filters.moment, now, filters.customDate);
  const priced = applyPriceFilter(dated, filters.price);
  const scoped = applyCategoryFilter(priced, filters.category);
  const upcoming = sortByStartDate(scoped);

  const forYouSource = sortByStartDate(applyPriceFilter(dated, filters.price));
  const forYouEvents =
    scoredPicks && scoredPicks.length > 0
      ? scoredPicks.map((pick) => pick.event)
      : pickForYouEvents(forYouSource, now);
  const forYouMeta = CURATED_SECTION_META.forYou;
  const forYouPicks =
    scoredPicks && scoredPicks.length > 0
      ? recommendationPicksToFeedItems(scoredPicks, now)
      : forYouEvents.map((eventRow, index) =>
          toFeedItem(eventRow, now, forYouMeta.badge, forYouMeta.badgeColor, index),
        );

  const sections: FeedSection[] = [];

  // Les carrousels (curés + catégories) ne s'affichent que sans filtre catégorie actif.
  if (filters.category === 'all') {
    const curatedSections: { key: CuratedSectionKey; events: PublicEventRow[] }[] = [
      { key: 'forYou', events: forYouEvents },
      { key: 'nearby', events: sortByDistance(upcoming).slice(0, MAX_ITEMS_PER_SECTION) },
      {
        key: 'free',
        events: upcoming
          .filter((eventRow) => eventRow.price_type === 'free')
          .slice(0, MAX_ITEMS_PER_SECTION),
      },
    ];

    for (const section of curatedSections) {
      if (section.events.length === 0) {
        continue;
      }
      const meta = CURATED_SECTION_META[section.key];
      sections.push({
        key: section.key,
        title: meta.title,
        items: section.events.map((eventRow, index) =>
          toFeedItem(eventRow, now, meta.badge, meta.badgeColor, index),
        ),
      });
    }

    const categorySections = EVENT_CATEGORIES.map((category) => ({
      category,
      events: upcoming.filter((eventRow) =>
        eventCategorySlugs(eventRow).includes(category.slug),
      ),
    }))
      .filter((entry) => entry.events.length > 0)
      .sort((first, second) => second.events.length - first.events.length)
      .slice(0, MAX_CATEGORY_SECTIONS);

    for (const entry of categorySections) {
      sections.push({
        key: entry.category.slug,
        title: entry.category.label,
        items: entry.events
          .slice(0, MAX_ITEMS_PER_SECTION)
          .map((eventRow, index) =>
            toFeedItem(eventRow, now, entry.category.label, entry.category.color, index),
          ),
      });
    }
  }

  const allEvents = upcoming.map((eventRow, index) => {
    const badge = primaryCategoryBadge(eventRow);
    return toFeedItem(eventRow, now, badge.label, badge.color, index);
  });

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
