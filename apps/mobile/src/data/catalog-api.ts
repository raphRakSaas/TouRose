import {
  catalogSearchHitSchema,
  publicCollectionRowSchema,
  publicEventMediaSchema,
  publicEventRowSchema,
  publicPlaceMediaSchema,
  publicPlaceRowSchema,
  recommendationPicksSchema,
  type CatalogSearchHit,
  type PublicCollectionRow,
  type PublicEventMedia,
  type PublicEventRow,
  type PublicPlaceMedia,
  type PublicPlaceRow,
  type RecommendationPick,
} from '@tourose/contracts';
import { z } from 'zod';

import { getSupabaseClient } from '@/src/lib/supabase';

export async function fetchUpcomingEvents(limitCount = 20): Promise<PublicEventRow[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('list_upcoming_public_events', {
    limit_count: limitCount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return z.array(publicEventRowSchema).parse(data ?? []);
}

export type FetchPublicPlacesOptions = {
  limitCount?: number;
  latitude?: number;
  longitude?: number;
  /** Exclut les salles d’événements OpenAgenda (`cultural_venue`). Défaut true. */
  discoveryOnly?: boolean;
};

export async function fetchPublicPlaces(
  limitCountOrOptions: number | FetchPublicPlacesOptions = 50,
): Promise<PublicPlaceRow[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const options: FetchPublicPlacesOptions =
    typeof limitCountOrOptions === 'number'
      ? { limitCount: limitCountOrOptions }
      : limitCountOrOptions;

  const { data, error } = await client.rpc('list_public_places', {
    limit_count: options.limitCount ?? 50,
    origin_latitude: options.latitude ?? null,
    origin_longitude: options.longitude ?? null,
    discovery_only: options.discoveryOnly ?? true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return z.array(publicPlaceRowSchema).parse(data ?? []);
}

export async function fetchPublicCollections(limitCount = 10): Promise<PublicCollectionRow[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('list_public_collections', {
    limit_count: limitCount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return z.array(publicCollectionRowSchema).parse(data ?? []);
}

export async function searchPublicCatalog(
  searchQuery: string,
  resultLimit = 20,
): Promise<CatalogSearchHit[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const trimmedQuery = searchQuery.trim();
  if (!trimmedQuery) {
    return [];
  }

  const { data, error } = await client.rpc('search_public_catalog', {
    search_query: trimmedQuery,
    result_limit: resultLimit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return z.array(catalogSearchHitSchema).parse(data ?? []);
}

export async function fetchPublicPlaceBySlug(placeSlug: string): Promise<PublicPlaceRow | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('get_public_place', {
    place_slug: placeSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = z.array(publicPlaceRowSchema).parse(data ?? []);
  return rows[0] ?? null;
}

export async function fetchPublicEventBySlug(eventSlug: string): Promise<PublicEventRow | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('get_public_event', {
    event_slug: eventSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = z.array(publicEventRowSchema).parse(data ?? []);
  return rows[0] ?? null;
}

/** Toutes les images publiques liées à un événement (cover en premier). */
export async function fetchEventMedia(eventId: string): Promise<PublicEventMedia[]> {
  return fetchEntityMedia('event', eventId, publicEventMediaSchema, ['allowed', 'needs_review']);
}

/** Toutes les images publiques liées à un lieu (cover en premier). */
export async function fetchPlaceMedia(placeId: string): Promise<PublicPlaceMedia[]> {
  return fetchEntityMedia('place', placeId, publicPlaceMediaSchema, ['allowed']);
}

async function fetchEntityMedia<T>(
  entityType: 'event' | 'place',
  entityId: string,
  mediaSchema: z.ZodType<T>,
  allowedRightsStatuses: string[],
): Promise<T[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('entity_media')
    .select(
      'position, is_cover, media_assets!inner ( remote_url, alt_text, attribution_text, rights_status )',
    )
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .in('media_assets.rights_status', allowedRightsStatuses)
    .order('is_cover', { ascending: false })
    .order('position', { ascending: true });

  if (error || !data) {
    return [];
  }

  const mediaRows = data
    .map((row) => {
      const asset = row.media_assets as unknown as {
        remote_url: string | null;
        alt_text: string | null;
        attribution_text: string | null;
      } | null;
      if (!asset?.remote_url) {
        return null;
      }
      return {
        position: row.position as number,
        is_cover: row.is_cover as boolean,
        remote_url: asset.remote_url,
        alt_text: asset.alt_text,
        attribution_text: asset.attribution_text,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return z.array(mediaSchema).parse(mediaRows);
}

/** Lieu public par id (fiche événement → lieu associé). */
export async function fetchPublicPlaceById(placeId: string): Promise<PublicPlaceRow | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from('public_places')
    .select('*')
    .eq('id', placeId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return publicPlaceRowSchema.parse(data);
}

export type RecommendationRequest = {
  now?: string;
  latitude?: number;
  longitude?: number;
  weatherCode?: number;
  price?: 'all' | 'free' | 'paid';
  interests?: string[];
  company?: string;
  limit?: number;
};

export async function fetchRecommendationPicks(
  request: RecommendationRequest = {},
): Promise<RecommendationPick[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('score_public_event_recommendations', {
    payload: {
      now: request.now,
      latitude: request.latitude,
      longitude: request.longitude,
      weather_code: request.weatherCode,
      price: request.price ?? 'all',
      interests: request.interests ?? [],
      company: request.company,
      limit: request.limit ?? 3,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return recommendationPicksSchema.parse(data ?? []);
}

export async function logRecommendationImpression(input: {
  eventIds: string[];
  reasons: unknown;
  sessionHash?: string;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  await client.rpc('log_recommendation_impression', {
    payload: {
      event_ids: input.eventIds,
      reasons: input.reasons,
      session_hash: input.sessionHash,
    },
  });
}
