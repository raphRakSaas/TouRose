import {
  catalogSearchHitSchema,
  publicEventRowSchema,
  publicPlaceRowSchema,
  type CatalogSearchHit,
  type PublicEventRow,
  type PublicPlaceRow,
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

export async function fetchPublicPlaces(limitCount = 50): Promise<PublicPlaceRow[]> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configuré — lance `pnpm dev:up`.');
  }

  const { data, error } = await client.rpc('list_public_places', {
    limit_count: limitCount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return z.array(publicPlaceRowSchema).parse(data ?? []);
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
