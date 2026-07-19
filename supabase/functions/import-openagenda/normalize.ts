/** Pure helpers for OpenAgenda → TouRose normalization (Deno edge + tests). */

export type OpenAgendaTiming = {
  begin?: string;
  end?: string;
};

export type OpenAgendaLocation = {
  uid?: number | string;
  name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

export type OpenAgendaImage = {
  base?: string;
  filename?: string;
  size?: { width?: number; height?: number };
  variants?: Array<{
    type?: string;
    filename?: string;
    size?: { width?: number; height?: number };
  }>;
};

export type OpenAgendaEvent = {
  uid?: number | string;
  title?: string | Record<string, string>;
  description?: string | Record<string, string>;
  longDescription?: string | Record<string, string>;
  slug?: string;
  status?: number | string;
  keywords?: { fr?: string[] } | string[];
  location?: OpenAgendaLocation | null;
  timings?: OpenAgendaTiming[];
  firstTiming?: OpenAgendaTiming;
  lastTiming?: OpenAgendaTiming;
  registration?: Array<{ type?: string; value?: string }>;
  /** Tarifs / conditions de participation (multilingue, mode detailed=1). */
  conditions?: string | Record<string, string>;
  /** Accessibilité handicap : hi/ii/mi/pi/vi → booléens (mode detailed=1). */
  accessibility?: Record<string, boolean>;
  /** Tranche d'âge conseillée (mode detailed=1). */
  age?: { min?: number | null; max?: number | null };
  /** 1 = sur place, 2 = en ligne, 3 = mixte. */
  attendanceMode?: number;
  onlineAccessLink?: string | null;
  timezone?: string;
  image?: OpenAgendaImage | null;
  imageCredits?: string;
  updatedAt?: string;
  createdAt?: string;
  'types-devenements'?: Array<number | string> | null;
  /** Legacy checkbox — option id 1 = entrée libre (souvent vide sur l'agenda Toulouse). */
  entreelibre?: Array<number | string> | null;
  /** Participation : 35 = entrée libre, 42 = entrée gratuite. */
  participation?: Array<number | string> | null;
  /** Lien billetterie (URL) → signal payant si pas déjà gratuit. */
  billetterie?: string | null;
};

/**
 * OpenAgenda "types d'événements" option IDs → TouRose category slugs.
 * Source: schéma de l'agenda 42448083 (champ personnalisé `types-devenements`).
 */
export const OPENAGENDA_TYPE_TO_CATEGORY_SLUG: Record<string, string> = {
  '44': 'cinema',
  '16': 'conference',
  '17': 'congres',
  '19': 'sport',
  '20': 'exposition',
  '22': 'festival',
  '21': 'marche',
  '23': 'reunion-publique',
  '24': 'spectacle',
  '25': 'atelier',
  '45': 'visite',
};

export function mapOpenAgendaCategorySlugs(
  typeIds: Array<number | string> | null | undefined,
): string[] {
  if (!Array.isArray(typeIds)) {
    return [];
  }
  const slugs = new Set<string>();
  for (const typeId of typeIds) {
    const slug = OPENAGENDA_TYPE_TO_CATEGORY_SLUG[String(typeId)];
    if (slug) {
      slugs.add(slug);
    }
  }
  return [...slugs];
}

/** Option IDs that mean free entrance on the Toulouse metro OpenAgenda schema. */
const FREE_PARTICIPATION_IDS = new Set(['35', '42']);
const FREE_ENTREELIBRE_IDS = new Set(['1', 'true']);

function hasOptionId(
  values: Array<number | string> | null | undefined,
  allowedIds: ReadonlySet<string>,
): boolean {
  if (!Array.isArray(values)) {
    return false;
  }
  return values.some((value) => allowedIds.has(String(value)));
}

function isNonEmptyUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Derive TouRose `price_type` from OpenAgenda custom fields.
 * Priority: explicit free tags → ticket URL → unknown.
 */
export function mapOpenAgendaPriceType(eventRow: {
  participation?: Array<number | string> | null;
  entreelibre?: Array<number | string> | null;
  billetterie?: string | null;
}): 'free' | 'paid' | 'unknown' {
  if (
    hasOptionId(eventRow.participation, FREE_PARTICIPATION_IDS) ||
    hasOptionId(eventRow.entreelibre, FREE_ENTREELIBRE_IDS)
  ) {
    return 'free';
  }
  if (isNonEmptyUrl(eventRow.billetterie)) {
    return 'paid';
  }
  return 'unknown';
}

export type NormalizedEventDetails = {
  /** Tarifs / conditions (texte libre OpenAgenda). */
  conditions?: string;
  age_min?: number;
  age_max?: number;
  /** Codes accessibilité actifs : hi, ii, mi, pi, vi. */
  accessibility: string[];
  attendance_mode?: 'onsite' | 'online' | 'mixed';
  online_access_link?: string;
  keywords: string[];
  registration: Array<{ type: string; value: string }>;
  timezone?: string;
};

function normalizeKeywords(
  keywords: { fr?: string[] } | string[] | undefined,
): string[] {
  if (Array.isArray(keywords)) {
    return keywords.filter((keyword): keyword is string => typeof keyword === 'string');
  }
  if (keywords && Array.isArray(keywords.fr)) {
    return keywords.fr.filter((keyword): keyword is string => typeof keyword === 'string');
  }
  return [];
}

const ATTENDANCE_MODES: Record<number, NormalizedEventDetails['attendance_mode']> = {
  1: 'onsite',
  2: 'online',
  3: 'mixed',
};

/** Regroupe tous les détails publics OpenAgenda utiles à la fiche événement. */
export function buildOpenAgendaEventDetails(eventRow: OpenAgendaEvent): NormalizedEventDetails {
  const conditions = localizeText(eventRow.conditions) || undefined;

  const accessibility = eventRow.accessibility
    ? Object.entries(eventRow.accessibility)
        .filter(([, isEnabled]) => isEnabled === true)
        .map(([code]) => code)
        .sort()
    : [];

  const registration = (eventRow.registration ?? [])
    .filter(
      (entry): entry is { type: string; value: string } =>
        typeof entry?.type === 'string' && typeof entry?.value === 'string' && entry.value.length > 0,
    )
    .map((entry) => ({ type: entry.type, value: entry.value }));

  const onlineAccessLink =
    typeof eventRow.onlineAccessLink === 'string' && isNonEmptyUrl(eventRow.onlineAccessLink)
      ? eventRow.onlineAccessLink.trim()
      : undefined;

  return {
    conditions,
    age_min: typeof eventRow.age?.min === 'number' ? eventRow.age.min : undefined,
    age_max: typeof eventRow.age?.max === 'number' ? eventRow.age.max : undefined,
    accessibility,
    attendance_mode:
      typeof eventRow.attendanceMode === 'number'
        ? ATTENDANCE_MODES[eventRow.attendanceMode]
        : undefined,
    online_access_link: onlineAccessLink,
    keywords: normalizeKeywords(eventRow.keywords),
    registration,
    timezone: eventRow.timezone,
  };
}

export type NormalizedImportPayload = {
  source_id: string;
  territory_id: string;
  external_id: string;
  external_url?: string;
  payload_hash: string;
  raw_payload: Record<string, unknown>;
  source_updated_at?: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  status: 'published' | 'draft';
  price_type: 'free' | 'paid' | 'donation' | 'unknown';
  indoor_outdoor: 'indoor' | 'outdoor' | 'mixed' | 'unknown';
  official_url?: string;
  latitude?: number;
  longitude?: number;
  place: {
    external_id: string;
    slug: string;
    name: string;
    summary?: string;
    place_type: 'cultural_venue';
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    payload_hash: string;
    status: 'published';
  } | null;
  occurrences: Array<{ starts_at: string; ends_at: string | null }>;
  category_slugs: string[];
  details: NormalizedEventDetails;
  image: {
    remote_url: string;
    width_px?: number;
    height_px?: number;
    alt_text: string;
    author?: string;
    source_url: string;
    attribution_text: string;
  } | null;
};

export const OPENAGENDA_SOURCE_ID = '22222222-2222-2222-2222-222222222201';
export const TOULOUSE_TERRITORY_ID = '11111111-1111-1111-1111-111111111111';

export function localizeText(value: string | Record<string, string> | undefined): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return (value.fr ?? value.en ?? Object.values(value)[0] ?? '').trim();
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Stable SHA-256 hex via Web Crypto (Deno / modern runtimes). */
export async function hashPayload(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeys(record[key]);
    }
    return sorted;
  }
  return value;
}

export function isOpenAgendaEventPublic(eventRow: OpenAgendaEvent): boolean {
  // OpenAgenda: status 2 often means published/confirmed on public agendas.
  if (eventRow.status === undefined || eventRow.status === null) {
    return true;
  }
  if (typeof eventRow.status === 'number') {
    return eventRow.status === 2 || eventRow.status === 1;
  }
  const normalized = String(eventRow.status).toLowerCase();
  return normalized === '2' || normalized === 'published' || normalized === 'confirmed';
}

export function normalizeOpenAgendaImage(
  image: OpenAgendaImage | null | undefined,
  options: { title: string; sourceUrl?: string; credits?: string },
): NormalizedImportPayload['image'] {
  if (!image?.base || !options.sourceUrl) {
    return null;
  }

  const preferredVariant =
    image.variants?.find((variant) => variant.type === 'full' && variant.filename) ??
    image.variants?.find((variant) => variant.filename);
  const filename = preferredVariant?.filename ?? image.filename;
  if (!filename) {
    return null;
  }

  let remoteUrl: string;
  try {
    remoteUrl = new URL(filename, image.base).toString();
  } catch {
    return null;
  }

  if (!remoteUrl.startsWith('https://cdn.openagenda.com/')) {
    return null;
  }

  const credits = options.credits?.trim();
  return {
    remote_url: remoteUrl,
    width_px: preferredVariant?.size?.width ?? image.size?.width,
    height_px: preferredVariant?.size?.height ?? image.size?.height,
    alt_text: options.title,
    author: credits || undefined,
    source_url: options.sourceUrl,
    attribution_text: credits ? `Photo : ${credits} · OpenAgenda` : 'Photo : OpenAgenda',
  };
}

export async function normalizeOpenAgendaEvent(
  eventRow: OpenAgendaEvent,
  options?: { agendaUid?: string; sourceId?: string; territoryId?: string },
): Promise<NormalizedImportPayload> {
  const sourceId = options?.sourceId ?? OPENAGENDA_SOURCE_ID;
  const territoryId = options?.territoryId ?? TOULOUSE_TERRITORY_ID;
  const externalId = String(eventRow.uid ?? '');
  if (!externalId) {
    throw new Error('OpenAgenda event missing uid');
  }

  const title = localizeText(eventRow.title) || `Événement OpenAgenda ${externalId}`;
  const summary = localizeText(eventRow.description) || undefined;
  const description = localizeText(eventRow.longDescription) || summary;
  const slugBase = slugify(eventRow.slug ?? title) || `event-${externalId}`;
  const slug = `oa-${externalId}-${slugBase}`.slice(0, 120);

  const timings =
    (eventRow.timings?.length ? eventRow.timings : null) ??
    [eventRow.firstTiming, eventRow.lastTiming].filter(Boolean);
  const occurrences = timings
    .filter((timing): timing is OpenAgendaTiming => Boolean(timing?.begin))
    .map((timing) => ({
      starts_at: new Date(timing.begin as string).toISOString(),
      ends_at: timing.end ? new Date(timing.end).toISOString() : null,
    }));

  const location = eventRow.location ?? null;
  let place: NormalizedImportPayload['place'] = null;
  if (location?.name || location?.uid) {
    const placeExternalId = String(location.uid ?? slugify(location.name ?? 'lieu'));
    place = {
      external_id: placeExternalId,
      slug: `oa-place-${placeExternalId}-${slugify(location.name ?? 'lieu')}`.slice(0, 120),
      name: location.name?.trim() || `Lieu OpenAgenda ${placeExternalId}`,
      place_type: 'cultural_venue',
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      city: location.city ?? 'Toulouse',
      payload_hash: await hashPayload(location),
      status: 'published',
    };
  }

  const registrationUrl = eventRow.registration?.find(
    (entry) => entry.type === 'link' && entry.value,
  )?.value;
  const billetterieUrl =
    typeof eventRow.billetterie === 'string' && isNonEmptyUrl(eventRow.billetterie)
      ? eventRow.billetterie.trim()
      : undefined;

  const agendaUid = options?.agendaUid;
  const externalUrl = agendaUid
    ? `https://openagenda.com/agendas/${agendaUid}/events/${externalId}`
    : undefined;
  const image = normalizeOpenAgendaImage(eventRow.image, {
    title,
    sourceUrl: externalUrl,
    credits: eventRow.imageCredits,
  });

  const payloadHash = await hashPayload({
    uid: eventRow.uid,
    title: eventRow.title,
    description: eventRow.description,
    longDescription: eventRow.longDescription,
    timings: eventRow.timings,
    location: eventRow.location,
    status: eventRow.status,
    updatedAt: eventRow.updatedAt,
    image: eventRow.image,
    imageCredits: eventRow.imageCredits,
    participation: eventRow.participation,
    entreelibre: eventRow.entreelibre,
    billetterie: eventRow.billetterie,
    'types-devenements': eventRow['types-devenements'],
    conditions: eventRow.conditions,
    accessibility: eventRow.accessibility,
    age: eventRow.age,
    attendanceMode: eventRow.attendanceMode,
    onlineAccessLink: eventRow.onlineAccessLink,
    keywords: eventRow.keywords,
    registration: eventRow.registration,
  });

  return {
    source_id: sourceId,
    territory_id: territoryId,
    external_id: externalId,
    external_url: externalUrl,
    payload_hash: payloadHash,
    raw_payload: eventRow as Record<string, unknown>,
    source_updated_at: eventRow.updatedAt,
    title,
    slug,
    summary,
    description,
    status: isOpenAgendaEventPublic(eventRow) ? 'published' : 'draft',
    price_type: mapOpenAgendaPriceType(eventRow),
    indoor_outdoor: 'unknown',
    official_url: registrationUrl ?? billetterieUrl,
    latitude: location?.latitude,
    longitude: location?.longitude,
    place,
    occurrences,
    category_slugs: mapOpenAgendaCategorySlugs(eventRow['types-devenements']),
    details: buildOpenAgendaEventDetails(eventRow),
    image,
  };
}
