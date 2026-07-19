import {
  catalogSearchHitSchema,
  publicCollectionRowSchema,
  publicEventRowSchema,
  publicPlaceRowSchema,
  type CatalogSearchHit,
  type PublicCollectionRow,
  type PublicEventRow,
  type PublicPlaceRow,
} from '@tourose/contracts';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getEnv(name: string): string | undefined {
  return import.meta.env[name] as string | undefined;
}

function createBrowserOrBuildClient() {
  const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL') ?? 'http://127.0.0.1:54321';
  const supabaseAnonKey = getEnv('PUBLIC_SUPABASE_ANON_KEY') ?? '';

  if (!supabaseAnonKey || supabaseAnonKey.includes('replace-with')) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function loadUpcomingEvents(limitCount = 20): Promise<PublicEventRow[]> {
  const client = createBrowserOrBuildClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client.rpc('list_upcoming_public_events', {
    limit_count: limitCount,
  });
  if (error) {
    throw new Error(error.message);
  }
  return z.array(publicEventRowSchema).parse(data ?? []);
}

export async function loadPublicPlaces(limitCount = 50): Promise<PublicPlaceRow[]> {
  const client = createBrowserOrBuildClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client.rpc('list_public_places', {
    limit_count: limitCount,
    origin_latitude: 43.6045,
    origin_longitude: 1.444,
    discovery_only: true,
  });
  if (error) {
    throw new Error(error.message);
  }
  return z.array(publicPlaceRowSchema).parse(data ?? []);
}

export async function loadCatalogSearch(
  searchQuery: string,
  resultLimit = 20,
): Promise<CatalogSearchHit[]> {
  const client = createBrowserOrBuildClient();
  if (!client || !searchQuery.trim()) {
    return [];
  }

  const { data, error } = await client.rpc('search_public_catalog', {
    search_query: searchQuery.trim(),
    result_limit: resultLimit,
  });
  if (error) {
    throw new Error(error.message);
  }
  return z.array(catalogSearchHitSchema).parse(data ?? []);
}

export async function loadPublicPlaceBySlug(placeSlug: string): Promise<PublicPlaceRow | null> {
  const client = createBrowserOrBuildClient();
  if (!client) {
    return null;
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

export async function loadPublicEventBySlug(eventSlug: string): Promise<PublicEventRow | null> {
  const client = createBrowserOrBuildClient();
  if (!client) {
    return null;
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

export async function loadPublicCollections(limitCount = 20): Promise<PublicCollectionRow[]> {
  const client = createBrowserOrBuildClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client.rpc('list_public_collections', {
    limit_count: limitCount,
  });
  if (error) {
    throw new Error(error.message);
  }
  return z.array(publicCollectionRowSchema).parse(data ?? []);
}
