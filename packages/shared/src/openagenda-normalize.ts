/** OpenAgenda → TouRose normalization (shared + mirrored in Edge Function). */

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

export type OpenAgendaEvent = {
  uid?: number | string;
  title?: string | Record<string, string>;
  description?: string | Record<string, string>;
  longDescription?: string | Record<string, string>;
  slug?: string;
  status?: number | string;
  location?: OpenAgendaLocation | null;
  timings?: OpenAgendaTiming[];
  firstTiming?: OpenAgendaTiming;
  lastTiming?: OpenAgendaTiming;
  registration?: Array<{ type?: string; value?: string }>;
  image?: unknown;
  updatedAt?: string;
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

/** Node/Vitest-friendly SHA-256 via Web Crypto when available. */
export async function hashPayload(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isOpenAgendaEventPublic(eventRow: OpenAgendaEvent): boolean {
  if (eventRow.status === undefined || eventRow.status === null) {
    return true;
  }
  if (typeof eventRow.status === 'number') {
    return eventRow.status === 2 || eventRow.status === 1;
  }
  const normalized = String(eventRow.status).toLowerCase();
  return normalized === '2' || normalized === 'published' || normalized === 'confirmed';
}

export async function normalizeOpenAgendaEvent(
  eventRow: OpenAgendaEvent,
  options?: { agendaUid?: string; sourceId?: string; territoryId?: string },
) {
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
  let place: {
    external_id: string;
    slug: string;
    name: string;
    place_type: 'cultural_venue';
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    payload_hash: string;
    status: 'published';
  } | null = null;

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

  const agendaUid = options?.agendaUid;
  const externalUrl = agendaUid
    ? `https://openagenda.com/agendas/${agendaUid}/events/${externalId}`
    : undefined;

  const payloadHash = await hashPayload({
    uid: eventRow.uid,
    title: eventRow.title,
    description: eventRow.description,
    longDescription: eventRow.longDescription,
    timings: eventRow.timings,
    location: eventRow.location,
    status: eventRow.status,
    updatedAt: eventRow.updatedAt,
  });

  void eventRow.image;

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
    status: isOpenAgendaEventPublic(eventRow) ? ('published' as const) : ('draft' as const),
    price_type: 'unknown' as const,
    indoor_outdoor: 'unknown' as const,
    official_url: registrationUrl,
    latitude: location?.latitude,
    longitude: location?.longitude,
    place,
    occurrences,
  };
}
