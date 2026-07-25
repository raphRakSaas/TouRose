import {
  listDiscover,
  listFavorites,
  listVisited,
  type LocalCatalogItem,
  type LocalEntityType,
} from '@/src/data/local-catalog';
import { getLocalDatabase } from '@/src/lib/local-db';
import { getSupabaseClient } from '@/src/lib/supabase';

type CloudCatalogItem = {
  list_type: 'favorite' | 'discover' | 'visited';
  entity_type: LocalEntityType;
  entity_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  updated_at: string;
};

type MergePayload = {
  company?: string;
  interests?: string[];
  favorite: LocalCatalogItem[];
  discover: LocalCatalogItem[];
  visited: LocalCatalogItem[];
};

function toPayloadItem(item: LocalCatalogItem) {
  return {
    entity_type: item.entityType,
    entity_id: item.entityId,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    updated_at: item.updatedAt,
  };
}

function mergeByUpdatedAt(
  localItems: LocalCatalogItem[],
  cloudItems: CloudCatalogItem[],
): LocalCatalogItem[] {
  const merged = new Map<string, LocalCatalogItem>();

  for (const cloudItem of cloudItems) {
    merged.set(`${cloudItem.entity_type}:${cloudItem.entity_id}`, {
      entityType: cloudItem.entity_type,
      entityId: cloudItem.entity_id,
      slug: cloudItem.slug,
      title: cloudItem.title,
      subtitle: cloudItem.subtitle,
      payload: null,
      updatedAt: cloudItem.updated_at,
    });
  }

  for (const localItem of localItems) {
    const key = `${localItem.entityType}:${localItem.entityId}`;
    const existing = merged.get(key);
    if (!existing || existing.updatedAt < localItem.updatedAt) {
      merged.set(key, localItem);
    }
  }

  return [...merged.values()].sort((first, second) =>
    second.updatedAt.localeCompare(first.updatedAt),
  );
}

async function replaceLocalTable(
  tableName: 'local_favorites' | 'local_discover' | 'local_visited',
  items: LocalCatalogItem[],
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(`DELETE FROM ${tableName}`);
  for (const item of items) {
    await database.runAsync(
      `INSERT INTO ${tableName} (entity_type, entity_id, slug, title, subtitle, payload, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      item.entityType,
      item.entityId,
      item.slug,
      item.title,
      item.subtitle,
      item.payload ? JSON.stringify(item.payload) : null,
      item.updatedAt,
    );
  }
}

export async function syncLocalCatalogWithCloud(options?: {
  company?: string;
  interests?: string[];
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    return false;
  }

  const [favoriteRows, discoverRows, visitedRows] = await Promise.all([
    listFavorites(),
    listDiscover(),
    listVisited(),
  ]);

  const { data: cloudRows, error: cloudError } = await client.rpc('list_user_catalog_items');
  if (cloudError) {
    throw new Error(cloudError.message);
  }

  const cloudItems = (cloudRows ?? []) as CloudCatalogItem[];
  const cloudFavorites = cloudItems.filter((item) => item.list_type === 'favorite');
  const cloudDiscover = cloudItems.filter((item) => item.list_type === 'discover');
  const cloudVisited = cloudItems.filter((item) => item.list_type === 'visited');

  const mergedFavorites = mergeByUpdatedAt(favoriteRows, cloudFavorites);
  const mergedDiscover = mergeByUpdatedAt(discoverRows, cloudDiscover);
  const mergedVisited = mergeByUpdatedAt(visitedRows, cloudVisited);

  const payload: MergePayload = {
    company: options?.company,
    interests: options?.interests,
    favorite: mergedFavorites,
    discover: mergedDiscover,
    visited: mergedVisited,
  };

  const { error: mergeError } = await client.rpc('merge_user_catalog', {
    payload: {
      company: payload.company,
      interests: payload.interests,
      favorite: payload.favorite.map(toPayloadItem),
      discover: payload.discover.map(toPayloadItem),
      visited: payload.visited.map(toPayloadItem),
    },
  });

  if (mergeError) {
    throw new Error(mergeError.message);
  }

  await Promise.all([
    replaceLocalTable('local_favorites', mergedFavorites),
    replaceLocalTable('local_discover', mergedDiscover),
    replaceLocalTable('local_visited', mergedVisited),
  ]);

  return true;
}
